import Image from "next/image";
import Link from "next/link";
import HomeChat from "@/components/home-chat";
import { createServiceRoleClient } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { isPreChangeStage, normalizePosition, type Position } from "@/lib/teamChanges";
import type { HomeChatMessage } from "./actions";

type LatestMatch = {
    id: string;
    team_home: string;
    team_away: string;
    match_date: string | null;
    stage: string | null;
};

type MatchPerformanceRow = {
    player_id: string;
    goals: number | null;
    goals_conceded: number | null;
    yellow_cards: number | null;
    red_cards: number | null;
    played_full_match: boolean | null;
    is_starter: boolean | null;
    is_substitute_in: boolean | null;
};

type TopMatchPlayer = {
    name: string;
    points: number;
};

type TeamChangeRow = {
    team_id: string;
    player_out_id: string | null;
    player_in_id: string | null;
};

type TopMatchParticipant = {
    teamId: string;
    userId: string;
    participantName: string;
    teamName: string;
    points: number;
};

const PLAYER_FETCH_CHUNK_SIZE = 200;

function formatParticipantName(profile: { first_name: string | null; last_name: string | null } | null): string {
    const firstName = profile?.first_name?.trim() ?? "";
    const lastName = profile?.last_name?.trim() ?? "";

    if (firstName && lastName) {
        return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
    }

    if (firstName) {
        return firstName;
    }

    if (lastName) {
        return `${lastName.charAt(0).toUpperCase()}.`;
    }

    return "Joueur inconnu";
}

function computeMatchPoints(position: Position, row: MatchPerformanceRow): number {
    const goals = Math.max(0, row.goals ?? 0);
    const goalsConceded = Math.max(0, row.goals_conceded ?? 0);
    const yellowCards = Math.max(0, row.yellow_cards ?? 0);
    const redCards = Math.max(0, row.red_cards ?? 0);

    const goalPoints = goals * 5;
    const appearancePoints = row.played_full_match ? 2 : row.is_starter || row.is_substitute_in ? 1 : 0;
    const hasPlayed = appearancePoints > 0;
    const cardPoints = yellowCards * -2 + redCards * -5;

    let defensivePoints = 0;
    if (position === "Gardien") {
        defensivePoints += hasPlayed && goalsConceded === 0 ? 5 : 0;
        defensivePoints -= goalsConceded;
    }

    if (position === "Défenseur") {
        defensivePoints += hasPlayed && goalsConceded === 0 ? 2 : 0;
        defensivePoints -= goalsConceded;
    }

    return goalPoints + appearancePoints + cardPoints + defensivePoints;
}

export default async function HomePage() {
    const supabase = await createClient();
    const serviceRoleClient = createServiceRoleClient();
    const adminClient = serviceRoleClient ?? supabase;
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id,user_id,author_name,content,created_at")
        .order("created_at", { ascending: false })
        .limit(40);

    let latestMatchResult = await adminClient
        .from("matches")
        .select("id,team_home,team_away,match_date,stage")
        .not("match_date", "is", null)
        .order("match_date", { ascending: false })
        .limit(1)
        .maybeSingle<LatestMatch>();

    if (latestMatchResult.error) {
        latestMatchResult = await supabase
            .from("matches")
            .select("id,team_home,team_away,match_date,stage")
            .not("match_date", "is", null)
            .order("match_date", { ascending: false })
            .limit(1)
            .maybeSingle<LatestMatch>();
        if (latestMatchResult.error) {
            // no-op
        }
    }

    const latestMatch = (latestMatchResult.data as LatestMatch | null) ?? null;
    const latestMatchError: string | null = latestMatchResult.error?.message ?? null;
    let countriesByCode = new Map<string, string>();
    let topPlayers: TopMatchPlayer[] = [];
    let topParticipants: TopMatchParticipant[] = [];
    let topPlayerUnavailable = false;
    let topParticipantUnavailable = false;

    if (latestMatch) {
        const { data: countriesData } = await supabase
            .from("countries")
            .select("code,name")
            .in("code", [latestMatch.team_home, latestMatch.team_away]);

        countriesByCode = new Map((countriesData ?? []).map((country) => [country.code, country.name]));

        const { data: performancesData, error: performancesError } = await adminClient
            .from("player_performances")
            .select("player_id,goals,goals_conceded,yellow_cards,red_cards,played_full_match,is_starter,is_substitute_in")
            .eq("match_id", latestMatch.id);

        if (performancesError) {
            topPlayerUnavailable = true;
        }

        const performanceRows = (performancesData ?? []) as MatchPerformanceRow[];
        const pointsByPlayerId = new Map<string, number>();

        if (performanceRows.length > 0) {
            const playerIds = Array.from(new Set(performanceRows.map((row) => row.player_id)));
            const playersData: Array<{ id: string; name: string; position: string }> = [];

            for (let index = 0; index < playerIds.length; index += PLAYER_FETCH_CHUNK_SIZE) {
                const chunk = playerIds.slice(index, index + PLAYER_FETCH_CHUNK_SIZE);
                const { data: chunkData, error: chunkError } = await adminClient
                    .from("players")
                    .select("id,name,position")
                    .in("id", chunk);

                if (chunkError) {
                    topPlayerUnavailable = true;
                    break;
                }

                playersData.push(...(chunkData ?? []));
            }

            const playersById = new Map(playersData.map((player) => [player.id, player]));

            const rankedPlayers = performanceRows
                .map((row) => {
                    const player = playersById.get(row.player_id);
                    if (!player) {
                        return null;
                    }

                    const position = normalizePosition(player.position);
                    if (!position) {
                        return null;
                    }

                    return {
                        name: player.name,
                        points: computeMatchPoints(position, row),
                    };
                })
                .filter((row): row is TopMatchPlayer => row !== null)
                .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "fr-FR"));

            for (const row of performanceRows) {
                const player = playersById.get(row.player_id);
                if (!player) {
                    continue;
                }

                const position = normalizePosition(player.position);
                if (!position) {
                    continue;
                }

                pointsByPlayerId.set(row.player_id, (pointsByPlayerId.get(row.player_id) ?? 0) + computeMatchPoints(position, row));
            }

            if (rankedPlayers.length > 0) {
                const bestScore = rankedPlayers[0].points;
                topPlayers = rankedPlayers.filter((player) => player.points === bestScore);
            }
        }

        if (pointsByPlayerId.size > 0) {
            const [teamsResult, activeTeamPlayersResult, teamChangesResult] = await Promise.all([
                adminClient.from("teams").select("id,name,user_id"),
                adminClient.from("team_players").select("team_id,player_id").eq("is_active", true),
                adminClient.from("team_changes").select("team_id,player_out_id,player_in_id").order("created_at", { ascending: true }),
            ]);

            if (teamsResult.error || activeTeamPlayersResult.error || teamChangesResult.error) {
                topParticipantUnavailable = true;
            } else {
                const teams = teamsResult.data ?? [];
                const activeTeamPlayers = activeTeamPlayersResult.data ?? [];
                const teamChanges = (teamChangesResult.data ?? []) as TeamChangeRow[];
                const preChangeMatch = isPreChangeStage(latestMatch.stage);

                const basePlayersByTeam = activeTeamPlayers.reduce<Record<string, string[]>>((acc, row) => {
                    acc[row.team_id] = [...(acc[row.team_id] ?? []), row.player_id];
                    return acc;
                }, {});

                const changesByTeam = teamChanges.reduce<Record<string, Array<{ player_out_id: string | null; player_in_id: string | null }>>>((acc, change) => {
                    acc[change.team_id] = [
                        ...(acc[change.team_id] ?? []),
                        {
                            player_out_id: change.player_out_id,
                            player_in_id: change.player_in_id,
                        },
                    ];
                    return acc;
                }, {});

                const userIds = Array.from(new Set(teams.map((team) => team.user_id)));
                const { data: profilesData, error: profilesError } = userIds.length
                    ? await adminClient.from("profiles").select("id,first_name,last_name").in("id", userIds)
                    : { data: [], error: null };

                if (profilesError) {
                    topParticipantUnavailable = true;
                }

                const profilesById = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));

                const rankedParticipants = teams
                    .map((team) => {
                        const baseIds = basePlayersByTeam[team.id] ?? [];
                        const effectiveIds = preChangeMatch
                            ? baseIds
                            : (() => {
                                  const nextIds = new Set(baseIds);
                                  for (const change of changesByTeam[team.id] ?? []) {
                                      if (change.player_out_id) {
                                          nextIds.delete(change.player_out_id);
                                      }
                                      if (change.player_in_id) {
                                          nextIds.add(change.player_in_id);
                                      }
                                  }
                                  return Array.from(nextIds);
                              })();

                        const points = effectiveIds.reduce((sum, playerId) => sum + (pointsByPlayerId.get(playerId) ?? 0), 0);

                        return {
                            teamId: team.id,
                            userId: team.user_id,
                            participantName: formatParticipantName(profilesById.get(team.user_id) ?? null),
                            teamName: team.name,
                            points,
                        };
                    })
                    .sort((a, b) => b.points - a.points || a.participantName.localeCompare(b.participantName, "fr-FR"));

                if (rankedParticipants.length > 0) {
                    const bestScore = rankedParticipants[0].points;
                    topParticipants = rankedParticipants.filter((participant) => participant.points === bestScore);
                }
            }
        } else if (topPlayerUnavailable) {
            topParticipantUnavailable = true;
        }
    }

    const initialMessages: HomeChatMessage[] = (messagesData ?? []).slice().reverse();

    return (
        <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_28%)]">
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_48px,rgba(255,255,255,0.05)_50px)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-emerald-950/40" />

            <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:px-8 lg:gap-14 lg:py-14">
                <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="text-left">
                        <span className="mb-4 inline-flex items-center rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-yellow-200">
                            Concours 2026
                        </span>

                        <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Vescovi.fr, LE rendez-vous de la coupe du monde 2026.
                        </h1>

                        <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
                            Crée ton équipe idéale, compare tes choix et profite d’un vrai concours de pronostics entre amis autour des plus grandes affiches du tournoi.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/team"
                                className="inline-flex items-center justify-center rounded-full border border-yellow-300 bg-yellow-300 px-6 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-yellow-500/20 transition hover:-translate-y-0.5 hover:bg-yellow-200"
                            >
                                Créer mon équipe
                            </Link>
                            <Link
                                href="/home#dernier-match"
                                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:border-yellow-300/70 hover:bg-white/15"
                            >
                                Voir le dernier match
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -inset-4 rounded-[2rem] bg-yellow-300/10 blur-3xl" aria-hidden="true" />
                        <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-yellow-300/15 to-transparent" aria-hidden="true" />

                            <div className="relative flex flex-col items-center text-center">
                                <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border-4 border-yellow-300/80 bg-white shadow-2xl shadow-black/20 sm:h-56 sm:w-56">
                                    <Image
                                        src="/logo.png"
                                        alt="Logo Vescovi.fr"
                                        fill
                                        priority
                                        className="object-cover"
                                        sizes="(max-width: 640px) 192px, 224px"
                                    />
                                </div>

                                <p className="mt-6 text-sm font-bold uppercase tracking-[0.28em] text-yellow-200">
                                    Ton onze idéal pour 2026
                                </p>
                                <p className="mt-3 max-w-sm text-sm leading-7 text-emerald-50/85">
                                    Sélectionne tes meilleurs joueurs, surveille les points et prépare-toi à grimper au classement match après match.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <LatestMatchSection
                    match={latestMatch}
                    countriesByCode={countriesByCode}
                    topPlayers={topPlayers}
                    topParticipants={topParticipants}
                    topPlayerUnavailable={topPlayerUnavailable}
                    topParticipantUnavailable={topParticipantUnavailable}
                    loadError={latestMatchError}
                />

                <HomeChat
                    initialMessages={initialMessages}
                    currentUserId={user?.id ?? null}
                    loadError={messagesError?.message ?? null}
                />

            </main>
        </div>
    );
}

function LatestMatchSection({
    match,
    countriesByCode,
    topPlayers,
    topParticipants,
    topPlayerUnavailable,
    topParticipantUnavailable,
    loadError,
}: {
    match: LatestMatch | null;
    countriesByCode: Map<string, string>;
    topPlayers: TopMatchPlayer[];
    topParticipants: TopMatchParticipant[];
    topPlayerUnavailable: boolean;
    topParticipantUnavailable: boolean;
    loadError: string | null;
}) {
    const formattedDate = match?.match_date
        ? new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(match.match_date))
        : null;

    const homeTeam = match ? countriesByCode.get(match.team_home) ?? match.team_home : null;
    const awayTeam = match ? countriesByCode.get(match.team_away) ?? match.team_away : null;

    return (
        <section id="dernier-match" className="scroll-mt-28">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Classement
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                        Dernier match saisi
                    </h2>
                </div>
                <p className="max-w-xl text-sm leading-7 text-emerald-50/75">
                    Cette section indique le match le plus recent enregistre pour verifier que le classement est bien a jour.
                </p>
            </div>

            <article className="overflow-hidden rounded-[1.75rem] border border-yellow-300/30 bg-gradient-to-br from-yellow-300/15 via-white/10 to-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
                {loadError ? (
                    <p className="text-sm text-red-200">
                        Impossible de charger le dernier match : {loadError}
                    </p>
                ) : match ? (
                    <>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="rounded-full bg-yellow-300 px-3 py-1 font-black text-emerald-950">
                                {match.stage ?? "Competition"}
                            </span>
                            {formattedDate ? <time className="text-emerald-50/70">{formattedDate}</time> : null}
                        </div>

                        <h3 className="mt-5 text-2xl font-black text-white sm:text-3xl">
                            {homeTeam} vs {awayTeam}
                        </h3>
                        {topPlayers.length > 0 ? (
                            <p className="mt-4 text-base leading-8 text-emerald-50/85">
                                {topPlayers.length > 1 ? "Meilleurs joueurs sur ce match : " : "Joueur le plus performant sur ce match : "}
                                <span className="font-black text-yellow-200">
                                    {topPlayers.map((player) => player.name).join(", ")}
                                </span>
                                {" "}avec <span className="font-black text-yellow-200">{topPlayers[0].points} pts</span>.
                            </p>
                        ) : topPlayerUnavailable ? (
                            <p className="mt-4 text-base leading-8 text-emerald-50/85">
                                Le meilleur joueur de ce match est temporairement indisponible.
                            </p>
                        ) : (
                            <p className="mt-4 text-base leading-8 text-emerald-50/85">
                                Aucun point joueur n&apos;a encore ete saisi pour ce match.
                            </p>
                        )}

                        {topParticipants.length > 0 ? (
                            <p className="mt-2 text-base leading-8 text-emerald-50/85">
                                {topParticipants.length > 1 ? "Meilleurs participants sur ce match : " : "Meilleur participant sur ce match : "}
                                <span className="font-black text-yellow-200">
                                    {topParticipants.map((participant, index) => (
                                        <span key={`${participant.teamId}-${participant.userId}`}>
                                            {index > 0 ? ", " : ""}
                                            <Link
                                                href={`/view-team?teamId=${participant.teamId}&userId=${participant.userId}`}
                                                className="underline underline-offset-2 transition hover:text-yellow-100"
                                            >
                                                {participant.participantName}
                                            </Link>
                                            {" "}(
                                            <Link
                                                href={`/view-team?teamId=${participant.teamId}&userId=${participant.userId}`}
                                                className="underline underline-offset-2 transition hover:text-yellow-100"
                                            >
                                                {participant.teamName}
                                            </Link>
                                            )
                                        </span>
                                    ))}
                                </span>
                                {" "}avec <span className="font-black text-yellow-200">{topParticipants[0].points} pts</span>.
                            </p>
                        ) : topParticipantUnavailable ? (
                            <p className="mt-2 text-base leading-8 text-emerald-50/85">
                                Le meilleur participant de ce match est temporairement indisponible.
                            </p>
                        ) : (
                            <p className="mt-2 text-base leading-8 text-emerald-50/85">
                                Aucun participant ne peut encore etre classe sur ce match.
                            </p>
                        )}

                        {topPlayerUnavailable || topParticipantUnavailable ? (
                            <p className="mt-2 text-sm text-amber-100/90">
                                Certaines statistiques du match sont temporairement indisponibles.
                            </p>
                        ) : null}
                    </>
                ) : (
                    <p className="text-sm text-emerald-50/85">
                        Aucun match avec une date valide n&apos;a encore ete saisi.
                    </p>
                )}
            </article>
        </section>
    );
}

