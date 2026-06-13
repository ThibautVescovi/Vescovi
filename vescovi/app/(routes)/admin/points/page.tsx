import { createClient } from "@/lib/supabaseServer";
import { requireAdminRole } from "@/lib/authz";
import PointsForm from "./points-form";

type ActiveTeamPlayerRow = {
    player_id: string;
};

type PageProps = {
    searchParams?: Promise<{
        matchId?: string;
    }>;
};

export default async function AdminPointsPage({ searchParams }: PageProps) {
    await requireAdminRole();

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const supabase = await createClient();

    const [playersResult, countriesResult, matchesResult, activeTeamPlayersResult] = await Promise.all([
        supabase
            .from("players")
            .select("id,name,country_code,position")
            .order("country_code", { ascending: true })
            .order("position", { ascending: true })
            .order("name", { ascending: true }),
        supabase.from("countries").select("code,name").order("name", { ascending: true }),
        supabase
            .from("matches")
            .select("id,team_home,team_away,match_date,stage,home_score,away_score")
            .order("match_date", { ascending: false }),
        supabase.from("team_players").select("player_id").eq("is_active", true),
    ]);

    const loadError =
        playersResult.error?.message ??
        countriesResult.error?.message ??
        matchesResult.error?.message ??
        activeTeamPlayersResult.error?.message;

    if (loadError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl rounded-lg border border-red-300/40 bg-red-500/20 p-6">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-100">Erreur</p>
                    <h1 className="mt-2 text-3xl font-black">Impossible de charger l&apos;administration</h1>
                    <p className="mt-3 text-sm text-red-100">{loadError}</p>
                </div>
            </div>
        );
    }

    const matches = matchesResult.data ?? [];
    const playerUsageCounts = ((activeTeamPlayersResult.data ?? []) as ActiveTeamPlayerRow[]).reduce<
        Record<string, number>
    >((acc, row) => {
        acc[row.player_id] = (acc[row.player_id] ?? 0) + 1;
        return acc;
    }, {});
    const selectedMatchId =
        resolvedSearchParams?.matchId && matches.some((match) => match.id === resolvedSearchParams.matchId)
            ? resolvedSearchParams.matchId
            : matches[0]?.id;

    const { data: pointsData, error: pointsError } = selectedMatchId
        ? await supabase
              .from("player_performances")
              .select(
                  "player_id,goals,played_full_match,is_starter,is_substitute_in,yellow_cards,red_cards,goals_conceded",
              )
              .eq("match_id", selectedMatchId)
        : { data: [], error: null };

    if (pointsError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl rounded-lg border border-red-300/40 bg-red-500/20 p-6">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-100">Erreur</p>
                    <h1 className="mt-2 text-3xl font-black">Impossible de charger les performances</h1>
                    <p className="mt-3 text-sm text-red-100">{pointsError.message}</p>
                </div>
            </div>
        );
    }

    return (
        <PointsForm
            key={selectedMatchId ?? "no-match"}
            players={playersResult.data ?? []}
            countries={countriesResult.data ?? []}
            matches={matches}
            existingPoints={pointsData ?? []}
            playerUsageCounts={playerUsageCounts}
            selectedMatchId={selectedMatchId ?? ""}
        />
    );
}
