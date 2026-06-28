import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import KiKiLaFilters from "./kikila-filters";

type Country = {
    code: string;
    name: string;
};

type Player = {
    id: string;
    name: string;
    country_code: string;
    position: string;
};

type Team = {
    id: string;
    name: string;
    user_id: string;
};

type Profile = {
    id: string;
    first_name: string | null;
    last_name: string | null;
};

function formatParticipantName(profile: Profile | undefined): string {
    const firstName = profile?.first_name?.trim() ?? "";
    const lastName = profile?.last_name?.trim() ?? "";

    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    }

    if (firstName || lastName) {
        return firstName || lastName;
    }

    return "Joueur inconnu";
}

export default async function KiKiLaPage({
    searchParams,
}: {
    searchParams: Promise<{ country?: string; playerId?: string }>;
}) {
    const supabase = await createClient();
    const { country, playerId } = await searchParams;

    const selectedCountryCode = typeof country === "string" ? country.trim().toUpperCase() : "";
    const selectedPlayerId = typeof playerId === "string" ? playerId.trim() : "";

    const { data: countriesData, error: countriesError } = await supabase
        .from("countries")
        .select("code,name")
        .order("name", { ascending: true });

    const countries = (countriesData ?? []) as Country[];

    const { data: playersData, error: playersError } = selectedCountryCode
        ? await supabase
              .from("players")
              .select("id,name,country_code,position")
              .eq("country_code", selectedCountryCode)
              .order("name", { ascending: true })
        : { data: [], error: null };

    const players = (playersData ?? []) as Player[];
    const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? null;

    const { data: teamPlayersData, error: teamPlayersError } = selectedPlayer
        ? await supabase
              .from("team_players")
              .select("team_id")
              .eq("player_id", selectedPlayer.id)
              .eq("is_active", true)
        : { data: [], error: null };

    const uniqueTeamIds = Array.from(
        new Set((teamPlayersData ?? []).map((row) => row.team_id).filter((teamId): teamId is string => Boolean(teamId))),
    );

    const { data: teamsData, error: teamsError } = uniqueTeamIds.length
        ? await supabase
              .from("teams")
              .select("id,name,user_id")
              .in("id", uniqueTeamIds)
        : { data: [], error: null };

    const teams = (teamsData ?? []) as Team[];
    const userIds = Array.from(new Set(teams.map((team) => team.user_id)));

    const { data: profilesData, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("id,first_name,last_name").in("id", userIds)
        : { data: [], error: null };

    const profiles = (profilesData ?? []) as Profile[];
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

    const participantRows = teams
        .map((team) => ({
            team,
            profile: profilesById.get(team.user_id),
            participantName: formatParticipantName(profilesById.get(team.user_id)),
        }))
        .sort((a, b) => a.participantName.localeCompare(b.participantName, "fr"));

    const loadError =
        countriesError?.message ??
        playersError?.message ??
        teamPlayersError?.message ??
        teamsError?.message ??
        profilesError?.message ??
        null;

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-8">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">Recherche joueur</p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">KiKiLa?</h1>
                    <p className="mt-3 text-base leading-7 text-emerald-50/80">
                        Choisis un pays puis un joueur pour voir tous les participants qui l&apos;ont dans leur équipe active.
                    </p>
                </div>

                {loadError ? (
                    <div className="mb-6 rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
                        Impossible de charger les donnees : {loadError}
                    </div>
                ) : null}

                <KiKiLaFilters
                    countries={countries}
                    players={players}
                    selectedCountryCode={selectedCountryCode}
                    selectedPlayerId={selectedPlayerId}
                />

                {selectedPlayer ? (
                    <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/20">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-2xl font-black">Participants avec {selectedPlayer.name}</h2>
                            <span className="rounded-full border border-yellow-300/40 bg-yellow-300/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-yellow-100">
                                {participantRows.length} resultat{participantRows.length > 1 ? "s" : ""}
                            </span>
                        </div>

                        {participantRows.length === 0 ? (
                            <p className="mt-4 text-sm text-emerald-50/80">
                                Aucun participant n&apos;a ce joueur dans son equipe active.
                            </p>
                        ) : (
                            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                {participantRows.map((row) => (
                                    <li key={row.team.id} className="rounded-xl border border-white/10 bg-emerald-950/35 p-4">
                                        <p className="truncate text-base font-black text-white">{row.participantName}</p>
                                        <p className="truncate text-sm text-emerald-100/75">Equipe : {row.team.name}</p>
                                        <Link
                                            href={`/view-team?teamId=${row.team.id}&userId=${row.team.user_id}`}
                                            className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-yellow-300/50 bg-yellow-300/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-yellow-100 transition hover:bg-yellow-300/20 sm:w-auto"
                                        >
                                            Voir l&apos;equipe complete
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}


