import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import * as Flags from "country-flag-icons/react/3x2";
import { hasFlag } from "country-flag-icons";

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

type PlayerPerformanceRow = {
    player_id: string;
    match_id: string;
    goals: number | null;
    played_full_match: boolean | null;
    is_starter: boolean | null;
    is_substitute_in: boolean | null;
    yellow_cards: number | null;
    red_cards: number | null;
    goals_conceded: number | null;
};

type MatchRow = {
    id: string;
    team_home: string;
    team_away: string;
    match_date: string | null;
    stage: string | null;
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

const alpha3ToAlpha2: Record<string, string> = {
    // Amérique du Nord, Centrale & Caraïbes (CONCACAF) — 6 places
    CAN: "CA", // Canada
    MEX: "MX", // Mexique
    USA: "US", // États-Unis
    CRC: "CR", // Costa Rica
    JAM: "JM", // Jamaïque
    PAN: "PA", // Panama
    HND: "HN", // Honduras
    GTM: "GT", // Guatemala
    SLV: "SV", // El Salvador
    CUB: "CU", // Cuba
    TTO: "TT", // Trinité-et-Tobago
    HTI: "HT", // Haïti

    // Amérique du Sud (CONMEBOL) — 6 places
    ARG: "AR", // Argentine
    BRA: "BR", // Brésil
    COL: "CO", // Colombie
    URY: "UY", // Uruguay
    ECU: "EC", // Équateur
    VEN: "VE", // Venezuela
    CHL: "CL", // Chili
    PER: "PE", // Pérou
    BOL: "BO", // Bolivie
    PRY: "PY", // Paraguay

    // Europe (UEFA) — 16 places
    ESP: "ES", // Espagne
    FRA: "FR", // France
    ENG: "GB", // Angleterre (même drapeau GB)
    GBR: "GB", // Grande-Bretagne
    DEU: "DE", // Allemagne
    PRT: "PT", // Portugal
    NLD: "NL", // Pays-Bas
    NED: "NL", // alias Pays-Bas
    BEL: "BE", // Belgique
    ITA: "IT", // Italie
    HRV: "HR", // Croatie
    SRB: "RS", // Serbie
    AUT: "AT", // Autriche
    CHE: "CH", // Suisse
    DNK: "DK", // Danemark
    TUR: "TR", // Turquie
    UKR: "UA", // Ukraine
    HUN: "HU", // Hongrie
    CZE: "CZ", // République tchèque
    POL: "PL", // Pologne
    SWE: "SE", // Suède
    NOR: "NO", // Norvège
    ISL: "IS", // Islande
    ROU: "RO", // Roumanie
    GRC: "GR", // Grèce
    SVN: "SI", // Slovénie
    SVK: "SK", // Slovaquie
    ALB: "AL", // Albanie
    GEO: "GE", // Géorgie
    SCT: "GB", // Écosse (même drapeau GB)
    SCO: "GB", // alias Écosse
    WAL: "GB", // Pays de Galles
    IRL: "IE", // Irlande
    FIN: "FI", // Finlande
    ISR: "IL", // Israël

    // Afrique (CAF) — 9 places
    MAR: "MA", // Maroc
    SEN: "SN", // Sénégal
    EGY: "EG", // Égypte
    NGA: "NG", // Nigeria
    CMR: "CM", // Cameroun
    CIV: "CI", // Côte d'Ivoire
    GHA: "GH", // Ghana
    TUN: "TN", // Tunisie
    DZA: "DZ", // Algérie
    ZAF: "ZA", // Afrique du Sud
    MLI: "ML", // Mali
    BFA: "BF", // Burkina Faso
    MDG: "MG", // Madagascar
    COD: "CD", // RD Congo
    MOZ: "MZ", // Mozambique
    UGA: "UG", // Ouganda
    TZA: "TZ", // Tanzanie
    AGO: "AO", // Angola
    GAB: "GA", // Gabon
    ZMB: "ZM", // Zambie
    KEN: "KE", // Kenya
    ETH: "ET", // Éthiopie
    BEN: "BJ", // Bénin
    CPV: "CV", // Cap-Vert
    GNB: "GW", // Guinée-Bissau
    GNQ: "GQ", // Guinée équatoriale
    LBY: "LY", // Libye
    COM: "KM", // Comores
    NER: "NE", // Niger

    // Asie (AFC) — 8 places
    JPN: "JP", // Japon
    KOR: "KR", // Corée du Sud
    IRN: "IR", // Iran
    AUS: "AU", // Australie
    SAU: "SA", // Arabie Saoudite
    IRQ: "IQ", // Irak
    JOR: "JO", // Jordanie
    UZB: "UZ", // Ouzbékistan
    CHN: "CN", // Chine
    IDN: "ID", // Indonésie
    THA: "TH", // Thaïlande
    OMN: "OM", // Oman
    BHR: "BH", // Bahreïn
    KWT: "KW", // Koweït
    QAT: "QA", // Qatar
    UAE: "AE", // Émirats arabes unis
    KGZ: "KG", // Kirghizistan
    TJK: "TJ", // Tadjikistan
    SYR: "SY", // Syrie
    PAL: "PS", // Palestine
    YEM: "YE", // Yémen
    AFG: "AF", // Afghanistan
    PRK: "KP", // Corée du Nord
    MYS: "MY", // Malaisie
    VNM: "VN", // Vietnam
    SGP: "SG", // Singapour
    MMR: "MM", // Myanmar
    LBN: "LB", // Liban

    // Océanie (OFC) — 1 place
    NZL: "NZ", // Nouvelle-Zélande
    FJI: "FJ", // Fidji
    PNG: "PG", // Papouasie-Nouvelle-Guinée
    VUT: "VU", // Vanuatu
    SLB: "SB", // Îles Salomon
    NCL: "NC", // Nouvelle-Calédonie (territoire FR)

    // Autres pays souvent utiles
    RUS: "RU", // Russie
    PHL: "PH", // Philippines
    IND: "IN", // Inde
    PAK: "PK", // Pakistan
    BGD: "BD", // Bangladesh
};

function getIso2(countryCode: string): string | null {
    if (!countryCode) return null;
    const normalized = countryCode.trim().toUpperCase();
    const iso2 =
        normalized.length === 2
            ? normalized
            : normalized.length === 3
              ? alpha3ToAlpha2[normalized]
              : undefined;
    if (!iso2 || !/^[A-Z]{2}$/.test(iso2)) return null;
    return iso2;
}

function CountryFlag({ countryCode, className = "" }: { countryCode: string; className?: string }) {
    const iso2 = getIso2(countryCode);
    if (!iso2 || !hasFlag(iso2)) return <span className={className}>🌍</span>;
    const FlagComponent = Flags[iso2 as keyof typeof Flags];
    if (!FlagComponent) return <span className={className}>🌍</span>;
    return <FlagComponent className={className} />;
}

function getAppearancePoints(row: Pick<PlayerPerformanceRow, "played_full_match" | "is_starter" | "is_substitute_in">): number {
    if (row.played_full_match) {
        return 2;
    }

    if (row.is_starter || row.is_substitute_in) {
        return 1;
    }

    return 0;
}

function computePlayerMatchPoints(position: Position, row: PlayerPerformanceRow): number {
    const goals = Math.max(0, row.goals ?? 0);
    const goalsConceded = Math.max(0, row.goals_conceded ?? 0);
    const yellowCards = Math.max(0, row.yellow_cards ?? 0);
    const redCards = Math.max(0, row.red_cards ?? 0);

    const goalPoints = goals * 5;
    const appearancePoints = getAppearancePoints(row);
    const cardPoints = yellowCards * -2 + redCards * -5;

    let defensivePoints = 0;
    const hasPlayed = appearancePoints > 0;

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

function formatPoints(value: number): string {
    return value > 0 ? `+${value}` : `${value}`;
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

    const teamPlayerIds = teamPlayers11.map((player) => player.id);
    const { data: playerPerformancesData, error: playerPerformancesError } = await supabase
        .from("player_performances")
        .select(
            "player_id,match_id,goals,played_full_match,is_starter,is_substitute_in,yellow_cards,red_cards,goals_conceded",
        )
        .in("player_id", teamPlayerIds);

    if (playerPerformancesError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Erreur de chargement
                    </h1>
                    <p className="mt-3 text-base leading-7 text-red-200">{playerPerformancesError.message}</p>
                </div>
            </div>
        );
    }

    const playerPerformances = (playerPerformancesData ?? []) as PlayerPerformanceRow[];
    const matchIds = Array.from(new Set(playerPerformances.map((row) => row.match_id)));

    const { data: matchesData, error: matchesError } = matchIds.length
        ? await supabase
              .from("matches")
              .select("id, team_home, team_away, match_date, stage")
              .in("id", matchIds)
        : { data: [], error: null };

    if (matchesError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Erreur de chargement
                    </h1>
                    <p className="mt-3 text-base leading-7 text-red-200">{matchesError.message}</p>
                </div>
            </div>
        );
    }

    const matches = ((matchesData ?? []) as MatchRow[]).sort((a, b) => {
        const aTime = a.match_date ? new Date(a.match_date).getTime() : 0;
        const bTime = b.match_date ? new Date(b.match_date).getTime() : 0;
        return aTime - bTime;
    });

    const positionOrder: Position[] = ["Gardien", "Défenseur", "Milieu", "Attaquant"];
    const positionByPlayerId = new Map(teamPlayers11.map((player) => [player.id, player.position]));
    const pointsByPlayerId = new Map(
        teamPlayers11.map((player) => [
            player.id,
            {
                total: 0,
                byMatch: {} as Record<string, number>,
            },
        ]),
    );

    for (const performance of playerPerformances) {
        const position = positionByPlayerId.get(performance.player_id);

        if (!position) {
            continue;
        }

        const points = computePlayerMatchPoints(position, performance);
        const current = pointsByPlayerId.get(performance.player_id);

        if (!current) {
            continue;
        }

        current.total += points;
        current.byMatch[performance.match_id] = (current.byMatch[performance.match_id] ?? 0) + points;
    }

    const teamPointsRows = [...teamPlayers11]
        .sort((a, b) => {
            const byPosition = positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
            if (byPosition !== 0) {
                return byPosition;
            }

            return a.name.localeCompare(b.name, "fr");
        })
        .map((player) => {
            const points = pointsByPlayerId.get(player.id) ?? { total: 0, byMatch: {} };

            return {
                id: player.id,
                name: player.name,
                position: player.position,
                total: points.total,
                byMatch: points.byMatch,
            };
        });

    const totalByMatch = matches.reduce<Record<string, number>>((acc, match) => {
        acc[match.id] = teamPointsRows.reduce((sum, row) => sum + (row.byMatch[match.id] ?? 0), 0);
        return acc;
    }, {});

    const teamTotalPoints = teamPointsRows.reduce((sum, row) => sum + row.total, 0);

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

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    {/* Terrain de foot */}
                    <div className="relative mx-auto aspect-[3/4] w-full max-w-[430px] rounded-lg border-4 border-white bg-gradient-to-b from-green-600 to-green-700 p-4 shadow-2xl shadow-black/50 sm:max-w-[500px] lg:max-w-[580px]">
                        {/* Ligne médiane */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-white opacity-40" />

                        {/* Cercle central */}
                        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white opacity-40" />

                        {/* Zones de but */}
                        <div className="absolute left-1/2 top-[2%] h-[16%] w-[46%] -translate-x-1/2 border-2 border-white opacity-40" />
                        <div className="absolute left-1/2 top-[2%] h-[8%] w-[24%] -translate-x-1/2 border-2 border-white opacity-40" />

                        <div className="absolute bottom-[2%] left-1/2 h-[16%] w-[46%] -translate-x-1/2 border-2 border-white opacity-40" />
                        <div className="absolute bottom-[2%] left-1/2 h-[8%] w-[24%] -translate-x-1/2 border-2 border-white opacity-40" />

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
                                            <CountryFlag countryCode={player.country_code} className="h-5 w-7 sm:h-6 sm:w-8 rounded-[2px] object-cover" />
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
                    <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
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
                                                    <CountryFlag countryCode={player.country_code} className="h-5 w-7 rounded-[2px] object-cover" />
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

                <div className="mt-8 rounded-lg border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/20">
                    <h2 className="text-xl font-black">Points par joueur et par match</h2>
                    {matches.length === 0 ? (
                        <p className="mt-3 text-sm text-emerald-50/80">
                            Aucun match noté pour le moment.
                        </p>
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/10 text-xs sm:text-sm">
                                <thead>
                                    <tr className="text-left text-emerald-50/80">
                                        <th className="sticky left-0 z-10 bg-emerald-950/80 px-3 py-2">Joueur</th>
                                        <th className="px-3 py-2">Poste</th>
                                        {matches.map((match) => (
                                            <th key={match.id} className="min-w-[120px] px-2 py-2 text-center sm:min-w-[140px] sm:px-3">
                                                <div className="font-semibold text-white">
                                                    {match.team_home} - {match.team_away}
                                                </div>
                                                <div className="text-xs text-emerald-50/70">
                                                    {match.match_date
                                                        ? new Intl.DateTimeFormat("fr-FR", {
                                                              day: "2-digit",
                                                              month: "2-digit",
                                                          }).format(new Date(match.match_date))
                                                        : "Date inconnue"}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-3 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {teamPointsRows.map((row) => (
                                        <tr key={row.id}>
                                            <td className="sticky left-0 z-10 bg-emerald-950/70 px-3 py-2 font-semibold">
                                                {row.name}
                                            </td>
                                            <td className="px-3 py-2 text-emerald-50/80">{row.position}</td>
                                            {matches.map((match) => {
                                                const matchPoints = row.byMatch[match.id] ?? 0;
                                                const pointsColor =
                                                    matchPoints > 0
                                                        ? "text-emerald-300"
                                                        : matchPoints < 0
                                                          ? "text-red-300"
                                                          : "text-emerald-50/70";

                                                return (
                                                    <td key={`${row.id}-${match.id}`} className={`px-2 py-2 text-center font-semibold sm:px-3 ${pointsColor}`}>
                                                        {formatPoints(matchPoints)}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2 text-right font-black text-yellow-300">
                                                {formatPoints(row.total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-white/20 bg-emerald-950/40">
                                        <td className="sticky left-0 z-10 bg-emerald-950/80 px-3 py-2 font-black text-yellow-300">
                                            Total match
                                        </td>
                                        <td className="px-3 py-2 text-emerald-50/70">Equipe</td>
                                        {matches.map((match) => (
                                            <td key={`total-${match.id}`} className="px-2 py-2 text-center font-black text-yellow-300 sm:px-3">
                                                {formatPoints(totalByMatch[match.id] ?? 0)}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 text-right font-black text-yellow-300">
                                            {formatPoints(teamTotalPoints)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
