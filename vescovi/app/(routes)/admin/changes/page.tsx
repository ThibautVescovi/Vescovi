import { createClient } from "@/lib/supabaseServer";
import { requireAdminRole } from "@/lib/authz";
import ChangesForm from "./changes-form";

type TeamWithPlayers = {
    id: string;
    name: string;
    user_id: string;
    players: Array<{
        id: string;
        name: string;
        position: string;
        country_code: string;
    }>;
};

export default async function AdminChangesPage() {
    const { user } = await requireAdminRole();

    const supabase = await createClient();

    // Charger l'équipe de l'utilisateur connecté
    const { data: userTeam, error: userTeamError } = await supabase
        .from("teams")
        .select("id, name, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!userTeam) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Aucune équipe
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Pas encore d&apos;équipe
                    </h1>
                    <p className="mt-3 text-base leading-7 text-emerald-50/80">
                        Tu dois créer une équipe avant de pouvoir gérer les changements.
                    </p>
                </div>
            </div>
        );
    }

    const [playersResult, teamPlayersResult] = await Promise.all([
        supabase
            .from("players")
            .select("id, name, country_code, position")
            .order("country_code", { ascending: true })
            .order("position", { ascending: true })
            .order("name", { ascending: true }),
        supabase
            .from("team_players")
            .select("player_id")
            .eq("team_id", userTeam.id)
            .eq("is_active", true),
    ]);

    const loadError =
        playersResult.error?.message ??
        teamPlayersResult.error?.message;

    if (loadError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl rounded-lg border border-red-300/40 bg-red-500/20 p-6">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-100">Erreur</p>
                    <h1 className="mt-2 text-3xl font-black">Impossible de charger l&apos;équipe</h1>
                    <p className="mt-3 text-sm text-red-100">{loadError}</p>
                </div>
            </div>
        );
    }

    // Créer une map des joueurs
    const playersById = new Map(
        (playersResult.data ?? []).map((p) => [p.id, p]),
    );

    // Récupérer les joueurs de l'équipe
    const playerIds = (teamPlayersResult.data ?? []).map((tp) => tp.player_id);
    const teamPlayerDetails = playerIds
        .map((id) => playersById.get(id))
        .filter(
            (p): p is NonNullable<typeof p> =>
                p !== null && p !== undefined,
        )
        .map((p) => ({
            id: p.id,
            name: p.name,
            position: p.position,
            country_code: p.country_code,
        }));

    const userTeamWithPlayers: TeamWithPlayers = {
        id: userTeam.id,
        name: userTeam.name,
        user_id: userTeam.user_id,
        players: teamPlayerDetails,
    };

    return (
        <ChangesForm
            userTeam={userTeamWithPlayers}
            players={playersResult.data ?? []}
            loadError={loadError ?? null}
        />
    );
}
