import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";

type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";

type TeamPlayer = {
    id: string;
    name: string;
    country_code: string;
    position: string;
};

type TeamPlayerRow = {
    player_id: string;
    position: string;
};

const slotPositions: Record<string, { x: number; y: number; position: Position }> = {
    "gk-1": { x: 50, y: 8, position: "Gardien" },
    "def-1": { x: 20, y: 30, position: "Défenseur" },
    "def-2": { x: 50, y: 25, position: "Défenseur" },
    "def-3": { x: 80, y: 30, position: "Défenseur" },
    "def-4": { x: 50, y: 35, position: "Défenseur" },
    "mid-1": { x: 20, y: 55, position: "Milieu" },
    "mid-2": { x: 50, y: 50, position: "Milieu" },
    "mid-3": { x: 80, y: 55, position: "Milieu" },
    "att-1": { x: 20, y: 75, position: "Attaquant" },
    "att-2": { x: 50, y: 80, position: "Attaquant" },
    "att-3": { x: 80, y: 75, position: "Attaquant" },
};

function normalizePosition(value: string): Position | null {
    const normalized = value
        .trim()
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (
        ["g", "gb", "gk", "goalkeeper", "keeper", "gardien"].includes(normalized) ||
        normalized.includes("gardien")
    ) {
        return "Gardien";
    }

    if (
        ["d", "df", "def", "defenseur", "defender", "defence", "defense"].includes(normalized) ||
        normalized.includes("defenseur") ||
        normalized.includes("defender")
    ) {
        return "Défenseur";
    }

    if (
        ["m", "mf", "mid", "milieu", "midfield", "midfielder"].includes(normalized) ||
        normalized.includes("milieu") ||
        normalized.includes("midfield")
    ) {
        return "Milieu";
    }

    if (
        ["a", "fw", "fwd", "att", "attaquant", "attack", "attacker", "forward"].includes(normalized) ||
        normalized.includes("attaquant") ||
        normalized.includes("forward")
    ) {
        return "Attaquant";
    }

    return null;
}

function getPosixFromPosition(position: Position, count: number): { x: number; y: number } {
    const slotKey = `${position === "Gardien" ? "gk" : position === "Défenseur" ? "def" : position === "Milieu" ? "mid" : "att"}-${count}`;
    return slotPositions[slotKey] || { x: 50, y: 50 };
}

function getPositionColor(position: Position): string {
    switch (position) {
        case "Gardien":
            return "bg-red-500";
        case "Défenseur":
            return "bg-blue-500";
        case "Milieu":
            return "bg-purple-500";
        case "Attaquant":
            return "bg-yellow-500";
        default:
            return "bg-gray-500";
    }
}


function getCountryFlag(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return "🌍";
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

export default async function ViewTeamPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Non authentifié
                    </h1>
                    <p className="mt-3 text-base leading-7 text-emerald-50/80">
                        Tu dois être connecté pour voir ton équipe.
                    </p>
                </div>
            </div>
        );
    }

    const { data: existingTeam, error: existingTeamError } = await supabase
        .from("teams")
        .select("id, name, total_points")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingTeamError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Une erreur est survenue
                    </h1>
                    <p className="mt-3 text-base leading-7 text-red-200">{existingTeamError.message}</p>
                </div>
            </div>
        );
    }

    if (!existingTeam) {
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
                        Tu n&apos;as pas encore créé d&apos;équipe pour ce concours. Crée ton équipe dès
                        maintenant !
                    </p>
                    <div className="mt-8">
                        <Link
                            href="/team"
                            className="inline-block rounded-md bg-yellow-300 px-6 py-3 text-base font-black text-green-950 shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                        >
                            Créer mon équipe
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const { data: teamPlayers, error: teamPlayersError } = await supabase
        .from("team_players")
        .select("player_id, position")
        .eq("team_id", existingTeam.id)
        .eq("is_active", true);

    if (teamPlayersError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Erreur de chargement
                    </h1>
                    <p className="mt-3 text-base leading-7 text-red-200">{teamPlayersError.message}</p>
                </div>
            </div>
        );
    }

    if (!teamPlayers || teamPlayers.length === 0) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Équipe vide
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        L&apos;équipe est vide
                    </h1>
                    <p className="mt-3 text-base leading-7 text-emerald-50/80">
                        Ton équipe n&apos;a pas de joueurs. Va l&apos;éditer pour ajouter des joueurs.
                    </p>
                    <div className="mt-8">
                        <Link
                            href="/team"
                            className="inline-block rounded-md bg-yellow-300 px-6 py-3 text-base font-black text-green-950 shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                        >
                            Éditer mon équipe
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const playerIds = (teamPlayers as TeamPlayerRow[]).map((tp) => tp.player_id);
    const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, name, country_code, position")
        .in("id", playerIds);

    if (playersError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Erreur de chargement
                    </h1>
                    <p className="mt-3 text-base leading-7 text-red-200">{playersError.message}</p>
                </div>
            </div>
        );
    }

    const players = (playersData ?? []) as TeamPlayer[];
    const playersById = new Map(players.map((p) => [p.id, p]));
    const positionCounts: Record<Position, number> = {
        Gardien: 0,
        Défenseur: 0,
        Milieu: 0,
        Attaquant: 0,
    };

    const teamPlayers11 = (teamPlayers as TeamPlayerRow[])
        .map((tp) => {
            const player = playersById.get(tp.player_id);
            const position = player ? normalizePosition(player.position) : null;

            if (!player || !position) {
                return null;
            }

            positionCounts[position] += 1;
            const posNum = positionCounts[position];
            const coords = getPosixFromPosition(position, posNum);

            return {
                ...player,
                position,
                slot: `${position === "Gardien" ? "gk" : position === "Défenseur" ? "def" : position === "Milieu" ? "mid" : "att"}-${posNum}`,
                coords,
            };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Mon équipe
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        {existingTeam.name}
                    </h1>
                    <p className="mt-2 text-base text-emerald-50/80">
                        Total de points : <span className="font-bold text-yellow-300">{existingTeam.total_points}</span>
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
                    {/* Terrain de foot */}
                    <div className="relative w-full max-w-md mx-auto lg:max-w-none aspect-[2/3] rounded-lg border-4 border-white bg-gradient-to-b from-green-600 to-green-700 p-4 shadow-2xl shadow-black/50">
                        {/* Ligne médiane */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-white opacity-40" />

                        {/* Cercle central */}
                        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white opacity-40" />

                        {/* Zones de but */}
                        <div className="absolute left-4 top-2 h-16 w-24 border-2 border-white opacity-40" />
                        <div className="absolute left-4 top-6 h-8 w-16 border-2 border-white opacity-40" />

                        <div className="absolute right-4 bottom-2 h-16 w-24 border-2 border-white opacity-40" />
                        <div className="absolute right-4 bottom-6 h-8 w-16 border-2 border-white opacity-40" />

                        {/* Joueurs */}
                        <div className="relative h-full w-full">
                            {teamPlayers11.map((player) => (
                                <div
                                    key={player.id}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 transform"
                                    style={{
                                        left: `${player.coords.x}%`,
                                        top: `${player.coords.y}%`,
                                    }}
                                >
                                    <div className="flex flex-col items-center gap-0.5">
                                        <div
                                            className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white font-black text-white shadow-lg ${getPositionColor(player.position)}`}
                                        >
                                            <span className="text-base sm:text-lg leading-none">{getCountryFlag(player.country_code)}</span>
                                        </div>
                                        <div className="rounded bg-black/70 px-1 py-0.5 text-center max-w-[80px] sm:max-w-[100px]">
                                            <p className="text-[9px] sm:text-[10px] font-bold text-white leading-tight truncate">
                                                {player.name.split(" ").slice(-1)[0]}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Panneau latéral */}
                    <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                        {/* Résumé de l'équipe */}
                        <div className="rounded-lg border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/20">
                            <h2 className="text-xl font-black">Composition</h2>
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between rounded-md border border-red-500/50 bg-red-500/15 px-3 py-2">
                                    <span className="text-sm font-semibold">Gardiens</span>
                                    <span className="font-black text-red-300">1</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-blue-500/50 bg-blue-500/15 px-3 py-2">
                                    <span className="text-sm font-semibold">Défenseurs</span>
                                    <span className="font-black text-blue-300">4</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-purple-500/50 bg-purple-500/15 px-3 py-2">
                                    <span className="text-sm font-semibold">Milieux</span>
                                    <span className="font-black text-purple-300">3</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-yellow-500/50 bg-yellow-500/15 px-3 py-2">
                                    <span className="text-sm font-semibold">Attaquants</span>
                                    <span className="font-black text-yellow-300">3</span>
                                </div>
                            </div>
                        </div>

                        {/* Liste des joueurs par poste */}
                        <div className="rounded-lg border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/20">
                            <h2 className="text-xl font-black">Équipe</h2>
                            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                                {teamPlayers11
                                    .sort((a, b) => {
                                        const posOrder = ["Gardien", "Défenseur", "Milieu", "Attaquant"];
                                        return (
                                            posOrder.indexOf(a.position) - posOrder.indexOf(b.position)
                                        );
                                    })
                                    .map((player) => (
                                        <div key={player.id} className="rounded border border-white/10 bg-white/5 p-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate font-semibold text-sm">{player.name}</p>
                                                    <p className="text-xs text-emerald-50/70">
                                                        {player.position}
                                                    </p>
                                                </div>
                                                <span className="text-lg shrink-0">
                                                    {getCountryFlag(player.country_code)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Bouton d'édition */}
                        <Link
                            href="/team"
                            className="block w-full rounded-md bg-yellow-300 px-5 py-3 text-center text-sm font-black text-green-950 shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                        >
                            Éditer mon équipe
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

