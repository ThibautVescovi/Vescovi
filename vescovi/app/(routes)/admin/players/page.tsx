import { createClient } from "@/lib/supabaseServer";
import { requireAdminRole } from "@/lib/authz";
import PlayersAdminForm from "./PlayersAdminForm";

export default async function AdminPlayersPage() {
    await requireAdminRole();

    const supabase = await createClient();
    const [playersResult, countriesResult] = await Promise.all([
        supabase
            .from("players")
            .select("id,name,country_code,position")
            .order("name", { ascending: true }),
        supabase.from("countries").select("code,name").order("name", { ascending: true }),
    ]);

    const loadError = playersResult.error?.message ?? countriesResult.error?.message;

    if (loadError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl rounded-lg border border-red-300/40 bg-red-500/20 p-6">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-100">Erreur</p>
                    <h1 className="mt-2 text-3xl font-black">Impossible de charger les joueurs</h1>
                    <p className="mt-3 text-sm text-red-100">{loadError}</p>
                </div>
            </div>
        );
    }

    return (
        <PlayersAdminForm
            players={playersResult.data ?? []}
            countries={countriesResult.data ?? []}
        />
    );
}
