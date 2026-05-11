"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { requireAdminRole } from "@/lib/authz";

type Appearance = "none" | "full" | "subbed_out" | "subbed_in";

type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";

type PlayerPerformanceRow = {
    player_id: string;
    goals: number | null;
    played_full_match: boolean | null;
    is_starter: boolean | null;
    is_substitute_in: boolean | null;
    yellow_cards: number | null;
    red_cards: number | null;
    goals_conceded: number | null;
};

export type PlayerPointInput = {
    playerId: string;
    position: Position;
    goals: number;
    goalsConceded: number;
    yellowCards: number;
    redCards: number;
    appearance: Appearance;
};

export type SavePointsResult = {
    ok: boolean;
    message: string;
};

export type CreateMatchResult = {
    ok: boolean;
    message: string;
    matchId?: string;
};

const ALLOWED_STAGES = [
    "Match 1",
    "Match 2",
    "Match 3",
    "Huitièmes",
    "Quarts",
    "Demis",
    "Finales",
] as const;

type Stage = (typeof ALLOWED_STAGES)[number];

function getAppearancePoints(appearance: Appearance) {
    if (appearance === "full") {
        return 2;
    }

    if (appearance === "subbed_out" || appearance === "subbed_in") {
        return 1;
    }

    return 0;
}

function hasPlayed(appearance: Appearance) {
    return appearance !== "none";
}

function hasCleanSheet(position: Position, appearance: Appearance, goalsConceded: number) {
    if (!hasPlayed(appearance)) {
        return false;
    }

    if (position !== "Gardien" && position !== "Défenseur") {
        return false;
    }

    return goalsConceded === 0;
}

function normalizeText(value: string) {
    return value
        .trim()
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizePosition(value: string): Position | null {
    const position = normalizeText(value);

    if (
        ["g", "gb", "gk", "goalkeeper", "keeper", "gardien"].includes(position) ||
        position.includes("gardien")
    ) {
        return "Gardien";
    }

    if (
        ["d", "df", "def", "defenseur", "defender", "defence", "defense"].includes(position) ||
        position.includes("defenseur") ||
        position.includes("defender")
    ) {
        return "Défenseur";
    }

    if (
        ["m", "mf", "mid", "milieu", "midfield", "midfielder"].includes(position) ||
        position.includes("milieu") ||
        position.includes("midfield")
    ) {
        return "Milieu";
    }

    if (
        ["a", "fw", "fwd", "att", "attaquant", "attack", "attacker", "forward"].includes(position) ||
        position.includes("attaquant") ||
        position.includes("forward")
    ) {
        return "Attaquant";
    }

    return null;
}

function computePoints(row: PlayerPointInput) {
    const goals = Math.max(0, row.goals);
    const goalsConceded = Math.max(0, row.goalsConceded);
    const yellowCards = Math.max(0, row.yellowCards);
    const redCards = Math.max(0, row.redCards);
    const cleanSheet = hasCleanSheet(row.position, row.appearance, goalsConceded);

    const goalPoints = goals * 5;
    const appearancePoints = getAppearancePoints(row.appearance);
    const cardPoints = yellowCards * -2 + redCards * -5;

    let defensivePoints = 0;

    if (row.position === "Gardien") {
        defensivePoints += cleanSheet ? 5 : 0;
        defensivePoints -= goalsConceded;
    }

    if (row.position === "Défenseur") {
        defensivePoints += cleanSheet ? 2 : 0;
        defensivePoints -= goalsConceded;
    }

    return goalPoints + appearancePoints + cardPoints + defensivePoints;
}

function clampInt(value: number, max: number) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const safe = Math.floor(value);

    if (safe < 0) {
        return 0;
    }

    if (safe > max) {
        return max;
    }

    return safe;
}

function toAppearance(row: Pick<PlayerPerformanceRow, "played_full_match" | "is_starter" | "is_substitute_in">): Appearance {
    if (row.played_full_match) {
        return "full";
    }

    if (row.is_substitute_in) {
        return "subbed_in";
    }

    if (row.is_starter) {
        return "subbed_out";
    }

    return "none";
}

function toPerformancePayload(row: PlayerPointInput) {
    const goals = clampInt(row.goals, 10);
    const goalsConceded = clampInt(row.goalsConceded, 15);
    const yellowCards = clampInt(row.yellowCards, 2);
    const redCards = clampInt(row.redCards, 1);

    return {
        player_id: row.playerId,
        goals,
        goals_conceded: goalsConceded,
        yellow_cards: yellowCards,
        red_cards: redCards,
        played_full_match: row.appearance === "full",
        is_starter: row.appearance === "full" || row.appearance === "subbed_out",
        is_substitute_in: row.appearance === "subbed_in",
    };
}

function isAllowedStage(value: string): value is Stage {
    return (ALLOWED_STAGES as readonly string[]).includes(value);
}

async function recalculateTeamTotals(): Promise<SavePointsResult> {
    const supabase = await createClient();

    const [{ data: performances, error: performancesError }, { data: players, error: playersError }] =
        await Promise.all([
            supabase
                .from("player_performances")
                .select(
                    "player_id,goals,played_full_match,is_starter,is_substitute_in,yellow_cards,red_cards,goals_conceded",
                ),
            supabase.from("players").select("id,position"),
        ]);

    if (performancesError) {
        return {
            ok: false,
            message: `Impossible de relire les performances joueurs: ${performancesError.message}`,
        };
    }

    if (playersError) {
        return {
            ok: false,
            message: `Impossible de relire les postes joueurs: ${playersError.message}`,
        };
    }

    const positionsByPlayerId = new Map(
        (players ?? []).map((player) => [player.id, player.position as string]),
    );

    const totalsByPlayer = ((performances ?? []) as PlayerPerformanceRow[]).reduce<Record<string, number>>(
        (acc, performance) => {
            const rawPosition = positionsByPlayerId.get(performance.player_id);

            if (!rawPosition) {
                return acc;
            }

            const normalizedPosition = normalizePosition(rawPosition);

            if (!normalizedPosition) {
                return acc;
            }

            const points = computePoints({
                playerId: performance.player_id,
                position: normalizedPosition,
                goals: performance.goals ?? 0,
                goalsConceded: performance.goals_conceded ?? 0,
                yellowCards: performance.yellow_cards ?? 0,
                redCards: performance.red_cards ?? 0,
                appearance: toAppearance(performance),
            });

            acc[performance.player_id] = (acc[performance.player_id] ?? 0) + points;
            return acc;
        },
        {},
    );

    const { data: activeTeamPlayers, error: activeTeamPlayersError } = await supabase
        .from("team_players")
        .select("team_id,player_id")
        .eq("is_active", true);

    if (activeTeamPlayersError) {
        return {
            ok: false,
            message: `Impossible de recalculer les equipes: ${activeTeamPlayersError.message}`,
        };
    }

    const totalsByTeam = (activeTeamPlayers ?? []).reduce<Record<string, number>>((acc, teamPlayer) => {
        acc[teamPlayer.team_id] = (acc[teamPlayer.team_id] ?? 0) + (totalsByPlayer[teamPlayer.player_id] ?? 0);
        return acc;
    }, {});

    const { data: teams, error: teamsError } = await supabase.from("teams").select("id");

    if (teamsError) {
        return {
            ok: false,
            message: `Impossible de relire les equipes: ${teamsError.message}`,
        };
    }

    const updates = (teams ?? []).map((team) =>
        supabase
            .from("teams")
            .update({ total_points: totalsByTeam[team.id] ?? 0 })
            .eq("id", team.id),
    );

    const updateResults = await Promise.all(updates);
    const updateError = updateResults.find((result) => result.error)?.error;

    if (updateError) {
        return {
            ok: false,
            message: `Impossible de mettre a jour les totaux equipes: ${updateError.message}`,
        };
    }

    return {
        ok: true,
        message: "Totaux equipes recalcules.",
    };
}

export async function savePointsForMatch(
    matchId: string,
    rows: PlayerPointInput[],
): Promise<SavePointsResult> {
    await requireAdminRole();

    if (!matchId) {
        return {
            ok: false,
            message: "Le match est obligatoire.",
        };
    }

    if (!rows.length) {
        return {
            ok: false,
            message: "Aucune donnée à enregistrer.",
        };
    }

    const supabase = await createClient();

    const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("id")
        .eq("id", matchId)
        .maybeSingle();

    if (matchError || !match) {
        return {
            ok: false,
            message: `Match invalide: ${matchError?.message ?? "introuvable"}`,
        };
    }

    const playerIds = Array.from(new Set(rows.map((row) => row.playerId).filter(Boolean)));
    const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id")
        .in("id", playerIds);

    if (playersError) {
        return {
            ok: false,
            message: `Erreur de verification des joueurs: ${playersError.message}`,
        };
    }

    if (!players || players.length !== playerIds.length) {
        return {
            ok: false,
            message: "Au moins un joueur est introuvable.",
        };
    }

    const payload = rows.map((row) => ({
        match_id: matchId,
        ...toPerformancePayload(row),
    }));

    const { error: upsertError } = await supabase
        .from("player_performances")
        .upsert(payload, { onConflict: "match_id,player_id" });

    if (upsertError) {
        return {
            ok: false,
            message: `Impossible de sauvegarder les performances: ${upsertError.message}`,
        };
    }

    const totalsResult = await recalculateTeamTotals();

    if (!totalsResult.ok) {
        return totalsResult;
    }

    revalidatePath("/admin/points");
    revalidatePath("/view-team");
    revalidatePath("/ranking");

    return {
        ok: true,
        message: "Performances enregistrées avec succès. Les points des equipes ont été recalculés.",
    };
}

export async function createMatch(input: {
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
    stage: Stage;
}): Promise<CreateMatchResult> {
    await requireAdminRole();

    const homeTeam = input.homeTeam.trim();
    const awayTeam = input.awayTeam.trim();
    const kickoffAt = input.kickoffAt.trim();
    const stage = input.stage.trim();
    const kickoffDate = new Date(kickoffAt);

    if (!homeTeam || !awayTeam || !kickoffAt) {
        return {
            ok: false,
            message: "Equipe domicile, equipe exterieure et date/heure sont obligatoires.",
        };
    }

    if (!isAllowedStage(stage)) {
        return {
            ok: false,
            message: "Phase invalide.",
        };
    }

    if (homeTeam === awayTeam) {
        return {
            ok: false,
            message: "Equipe domicile et equipe exterieure doivent etre differentes.",
        };
    }

    if (Number.isNaN(kickoffDate.getTime())) {
        return {
            ok: false,
            message: "Date/heure du match invalide.",
        };
    }

    const supabase = await createClient();
    const { data: countries, error: countriesError } = await supabase
        .from("countries")
        .select("code")
        .in("code", [homeTeam, awayTeam]);

    if (countriesError) {
        return {
            ok: false,
            message: `Impossible de verifier les pays: ${countriesError.message}`,
        };
    }

    if ((countries ?? []).length !== 2) {
        return {
            ok: false,
            message: "Selection de pays invalide.",
        };
    }

    const { data, error } = await supabase
        .from("matches")
        .insert({
            team_home: homeTeam,
            team_away: awayTeam,
            match_date: kickoffDate.toISOString(),
            stage,
        })
        .select("id")
        .single();

    if (error || !data) {
        return {
            ok: false,
            message: `Impossible de creer le match: ${error?.message ?? "erreur inconnue"}`,
        };
    }

    revalidatePath("/admin/points");

    return {
        ok: true,
        message: "Match cree.",
        matchId: data.id,
    };
}
