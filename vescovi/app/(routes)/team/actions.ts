"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";

type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";

export type TeamSelectionPayload = {
    slotId: string;
    position: Position;
    playerId: string;
};

export type SaveTeamResult = {
    ok: boolean;
    message: string;
};

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
        ["a", "fw", "fwd", "att", "attaquant", "attack", "attacker", "forward"].includes(
            position,
        ) ||
        position.includes("attaquant") ||
        position.includes("forward")
    ) {
        return "Attaquant";
    }

    return null;
}

export async function saveTeam(
    selections: TeamSelectionPayload[],
    wineName?: string,
): Promise<SaveTeamResult> {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            ok: false,
            message: "Tu dois être connecté pour sauvegarder ton équipe.",
        };
    }

    if (selections.length !== 11 || selections.some((selection) => !selection.playerId)) {
        return {
            ok: false,
            message: "Sélectionne les 11 joueurs avant de sauvegarder.",
        };
    }

    const trimmedWineName = typeof wineName === "string" ? wineName.trim() : "";
    const hasWineName = trimmedWineName.length > 0;

    const playerIds = selections.map((selection) => selection.playerId);
    const uniquePlayerIds = new Set(playerIds);

    if (uniquePlayerIds.size !== playerIds.length) {
        return {
            ok: false,
            message: "Un joueur ne peut être sélectionné qu'une seule fois.",
        };
    }

    const { data: selectedPlayers, error: playersError } = await supabase
        .from("players")
        .select("id,country_code,position")
        .in("id", Array.from(uniquePlayerIds));

    if (playersError) {
        return {
            ok: false,
            message: `Impossible de vérifier les joueurs : ${playersError.message}`,
        };
    }

    if (!selectedPlayers || selectedPlayers.length !== selections.length) {
        return {
            ok: false,
            message: "Certains joueurs sélectionnés n'existent plus.",
        };
    }

    const playersById = new Map(selectedPlayers.map((player) => [player.id, player]));
    const countries: Record<string, number> = {};
    const expectedPositions: Record<Position, number> = {
        Gardien: 0,
        Défenseur: 0,
        Milieu: 0,
        Attaquant: 0,
    };

    for (const selection of selections) {
        const player = playersById.get(selection.playerId);
        const playerPosition = player ? normalizePosition(player.position) : null;

        if (!player || playerPosition !== selection.position) {
            return {
                ok: false,
                message: "Au moins un joueur ne correspond pas au poste demandé.",
            };
        }

        expectedPositions[selection.position] += 1;
        countries[player.country_code] = (countries[player.country_code] ?? 0) + 1;
    }

    if (
        expectedPositions.Gardien !== 1 ||
        expectedPositions.Défenseur !== 4 ||
        expectedPositions.Milieu !== 3 ||
        expectedPositions.Attaquant !== 3
    ) {
        return {
            ok: false,
            message: "La composition doit contenir 1 gardien, 4 défenseurs, 3 milieux et 3 attaquants.",
        };
    }

    if (Object.keys(countries).length < 5) {
        return {
            ok: false,
            message: "Ton équipe doit représenter au minimum 5 nationalités.",
        };
    }

    if (Object.values(countries).some((count) => count > 3)) {
        return {
            ok: false,
            message: "Ton équipe ne peut pas contenir plus de 3 joueurs d'une même nationalité.",
        };
    }

    const { data: existingTeam, error: existingTeamError } = await supabase
        .from("teams")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingTeamError) {
        return {
            ok: false,
            message: `Impossible de récupérer ton équipe : ${existingTeamError.message}`,
        };
    }

    let teamId = existingTeam?.id as string | undefined;

    if (!teamId) {
        const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
                {
                    id: user.id,
                },
                {
                    onConflict: "id",
                },
            );

        if (profileError) {
            return {
                ok: false,
                message: `Impossible de préparer ton profil : ${profileError.message}`,
            };
        }

        const { data: createdTeam, error: createTeamError } = await supabase
            .from("teams")
            .insert({
                user_id: user.id,
                name: "Mon équipe",
                total_points: 0,
            })
            .select("id")
            .single();

        if (createTeamError || !createdTeam) {
            return {
                ok: false,
                message: `Impossible de créer ton équipe : ${createTeamError?.message ?? "erreur inconnue"}`,
            };
        }

        teamId = createdTeam.id;
    } else {
        const { error: updateTeamError } = await supabase
            .from("teams")
            .update({ name: "Mon équipe" })
            .eq("id", teamId)
            .eq("user_id", user.id);

        if (updateTeamError) {
            return {
                ok: false,
                message: `Impossible de mettre à jour ton équipe : ${updateTeamError.message}`,
            };
        }

        const { error: disablePlayersError } = await supabase
            .from("team_players")
            .update({ is_active: false })
            .eq("team_id", teamId);

        if (disablePlayersError) {
            return {
                ok: false,
                message: `Impossible de remplacer les anciens joueurs : ${disablePlayersError.message}`,
            };
        }
    }

    const rows = selections.map((selection) => {
        const player = playersById.get(selection.playerId);

        return {
            team_id: teamId,
            player_id: selection.playerId,
            position: player?.position,
            is_active: true,
        };
    });

    const { data: existingTeamPlayers, error: existingTeamPlayersError } = await supabase
        .from("team_players")
        .select("id,player_id")
        .eq("team_id", teamId);

    if (existingTeamPlayersError) {
        return {
            ok: false,
            message: `Impossible de récupérer les joueurs déjà enregistrés : ${existingTeamPlayersError.message}`,
        };
    }

    const existingRowsByPlayerId = new Map(
        (existingTeamPlayers ?? []).map((teamPlayer) => [teamPlayer.player_id, teamPlayer.id]),
    );
    const rowsToUpdate = rows
        .map((row) => ({
            ...row,
            id: existingRowsByPlayerId.get(row.player_id),
        }))
        .filter((row): row is typeof row & { id: string } => Boolean(row.id));
    const rowsToInsert = rows.filter((row) => !existingRowsByPlayerId.has(row.player_id));

    const updateResults = await Promise.all(
        rowsToUpdate.map((row) =>
            supabase
                .from("team_players")
                .update({
                    position: row.position,
                    is_active: true,
                })
                .eq("id", row.id)
                .eq("team_id", teamId),
        ),
    );
    const updateError = updateResults.find((result) => result.error)?.error;

    if (updateError) {
        return {
            ok: false,
            message: `Impossible de mettre à jour les joueurs : ${updateError.message}`,
        };
    }

    const { error: insertPlayersError } =
        rowsToInsert.length > 0
            ? await supabase.from("team_players").insert(rowsToInsert)
            : { error: null };

    if (insertPlayersError) {
        return {
            ok: false,
            message: `Impossible d'enregistrer les joueurs : ${insertPlayersError.message}`,
        };
    }

    const { data: existingEntry, error: existingEntryError } = await supabase
        .from("entries")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingEntryError) {
        return {
            ok: false,
            message: `Impossible de récupérer ton inscription : ${existingEntryError.message}`,
        };
    }

    if (existingEntry?.id) {
        const entryUpdatePayload: { team_id: string; wine_name?: string } = {
            team_id: teamId,
        };

        if (hasWineName) {
            entryUpdatePayload.wine_name = trimmedWineName;
        }

        const { error: updateEntryError } = await supabase
            .from("entries")
            .update(entryUpdatePayload)
            .eq("id", existingEntry.id)
            .eq("user_id", user.id);

        if (updateEntryError) {
            if (updateEntryError.code === "42501") {
                return {
                    ok: false,
                    message:
                        "Tes droits actuels ne permettent pas de lier ton équipe à ton inscription. Contacte un administrateur (RLS entries).",
                };
            }

            return {
                ok: false,
                message: `Impossible de mettre à jour ton inscription : ${updateEntryError.message}`,
            };
        }
    } else {
        const { error: createEntryError } = await supabase.from("entries").insert({
            user_id: user.id,
            team_id: teamId,
            wine_name: hasWineName ? trimmedWineName : null,
        });

        if (createEntryError) {
            if (createEntryError.code === "42501") {
                return {
                    ok: false,
                    message:
                        "Tes droits actuels ne permettent pas de créer ton inscription. Contacte un administrateur (RLS entries).",
                };
            }

            return {
                ok: false,
                message: `Impossible de créer ton inscription : ${createEntryError.message}`,
            };
        }
    }

    revalidatePath("/team");

    return {
        ok: true,
        message: "Ton équipe est sauvegardée.",
    };
}
