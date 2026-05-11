import { createClient } from "@/lib/supabaseServer";
import TeamForm, { Country, InitialSelection, Player } from "./team-form";

type TeamPlayerRow = {
    player_id: string;
};

type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";

const slotPrefixes: Record<Position, string> = {
    Gardien: "gk",
    Défenseur: "def",
    Milieu: "mid",
    Attaquant: "att",
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

    if (position.includes("gardien") || ["g", "gb", "gk", "goalkeeper", "keeper"].includes(position)) {
        return "Gardien";
    }

    if (
        position.includes("defenseur") ||
        position.includes("defender") ||
        ["d", "df", "def", "defence", "defense"].includes(position)
    ) {
        return "Défenseur";
    }

    if (
        position.includes("milieu") ||
        position.includes("midfield") ||
        ["m", "mf", "mid", "midfielder"].includes(position)
    ) {
        return "Milieu";
    }

    if (
        position.includes("attaquant") ||
        position.includes("forward") ||
        ["a", "fw", "fwd", "att", "attack", "attacker"].includes(position)
    ) {
        return "Attaquant";
    }

    return null;
}

export default async function TeamPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const [playersResult, countriesResult] = await Promise.all([
        supabase
            .from("players")
            .select("id,name,country_code,position")
            .order("name", { ascending: true }),
        supabase
            .from("countries")
            .select("code,name")
            .order("name", { ascending: true }),
    ]);

    const { data: existingTeam, error: existingTeamError } = user
        ? await supabase
              .from("teams")
              .select("id,name")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
        : { data: null, error: null };

    const { data: teamPlayers, error: teamPlayersError } = existingTeam?.id
        ? await supabase
              .from("team_players")
              .select("player_id")
              .eq("team_id", existingTeam.id)
              .eq("is_active", true)
        : { data: null, error: null };

    const { data: existingEntry, error: existingEntryError } = user
        ? await supabase
              .from("entries")
              .select("wine_name")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
        : { data: null, error: null };

    const players = (playersResult.data ?? []) as Player[];
    const playersById = new Map(players.map((player) => [player.id, player]));
    const positionCounts: Record<Position, number> = {
        Gardien: 0,
        Défenseur: 0,
        Milieu: 0,
        Attaquant: 0,
    };
    const initialSelections = ((teamPlayers ?? []) as TeamPlayerRow[]).reduce<InitialSelection[]>(
        (acc, teamPlayer) => {
            const player = playersById.get(teamPlayer.player_id);
            const position = player ? normalizePosition(player.position) : null;

            if (!player || !position) {
                return acc;
            }

            positionCounts[position] += 1;
            acc.push({
                slotId: `${slotPrefixes[position]}-${positionCounts[position]}`,
                position,
                playerId: player.id,
                countryCode: player.country_code,
            });

            return acc;
        },
        [],
    );

    const loadError =
        playersResult.error?.message ??
        countriesResult.error?.message ??
        existingTeamError?.message ??
        existingEntryError?.message ??
        teamPlayersError?.message ??
        null;
    const initialSelectionsKey =
        initialSelections
            .map((selection) => `${selection.slotId}:${selection.countryCode}:${selection.playerId}`)
            .sort()
            .join("|") || "empty";
    const initialWineName = existingEntry?.wine_name ?? "";
    const initialTeamName = existingTeam?.name ?? "Mon équipe";
    const formKey = `${initialSelectionsKey}|wine:${initialWineName}|team:${initialTeamName}`;

    return (
        <TeamForm
            key={formKey}
            players={players}
            countries={(countriesResult.data ?? []) as Country[]}
            initialSelections={initialSelections}
            initialWineName={initialWineName}
            initialTeamName={initialTeamName}
            loadError={loadError}
        />
    );
}
