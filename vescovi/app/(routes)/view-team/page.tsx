import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import * as Flags from "country-flag-icons/react/3x2";
import { hasFlag } from "country-flag-icons";
import { approveTeamEntry } from "./actions";

type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";
type PointsViewMode = "match" | "stage" | "total";

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

type TeamReference = {
    id: string;
    name: string;
    user_id: string;
};

type EntryReference = {
    id: string;
    wine_name: string | null;
    is_approved: boolean | null;
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

function normalizePointsViewMode(value?: string): PointsViewMode {
    if (value === "stage" || value === "total") {
        return value;
    }

    return "match";
}

export default async function ViewTeamPage({
    searchParams,
}: {
    searchParams: Promise<{ userId?: string; teamId?: string; view?: string }>;
}) {
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

    const { userId: targetUserId, teamId: targetTeamId, view } = await searchParams;
    const pointsViewMode = normalizePointsViewMode(view);

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
    const canApproveTeams = currentProfile?.role === "admin" || currentProfile?.role === "superadmin";

    const { data: selectedTeamFromScores, error: selectedTeamFromScoresError } = targetTeamId || targetUserId
        ? await supabase
              .from("team_scores")
              .select("team_id, team_name, user_id, created_at")
              .eq(targetTeamId ? "team_id" : "user_id", targetTeamId ?? targetUserId ?? "")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
        : { data: null, error: null };

    const viewedUserId = selectedTeamFromScores?.user_id ?? targetUserId ?? user.id;

    if (selectedTeamFromScoresError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Une erreur est survenue
                    </h1>
                    <p className="mt-3 text-base leading-7 text-red-200">{selectedTeamFromScoresError.message}</p>
                </div>
            </div>
        );
    }

    const isOwnTeam = viewedUserId === user.id;

    // Récupérer le profil du joueur affiché
    const { data: viewedProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", viewedUserId)
        .maybeSingle();

    const participantName =
        viewedProfile?.first_name || viewedProfile?.last_name
            ? [viewedProfile.first_name, viewedProfile.last_name].filter(Boolean).join(" ")
            : isOwnTeam
              ? "Mon équipe"
              : "Joueur inconnu";

    const selectedTeam: TeamReference | null = selectedTeamFromScores
        ? {
              id: selectedTeamFromScores.team_id,
              name: selectedTeamFromScores.team_name,
              user_id: selectedTeamFromScores.user_id,
          }
        : null;

    const { data: existingTeam, error: existingTeamError } = selectedTeam
        ? { data: selectedTeam, error: null }
        : await supabase
              .from("teams")
              .select("id, name, user_id")
              .eq("user_id", viewedUserId)
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
                        {isOwnTeam
                            ? "Tu n'as pas encore créé d'équipe pour ce concours. Crée ton équipe dès maintenant !"
                            : `${participantName} n'a pas encore créé d'équipe pour ce concours.`}
                    </p>
                    {isOwnTeam && (
                        <div className="mt-8">
                            <Link
                                href="/team"
                                className="inline-block rounded-md bg-yellow-300 px-6 py-3 text-base font-black text-green-950 shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                            >
                                Créer mon équipe
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const { data: viewedEntryData, error: viewedEntryError } = await supabase
        .from("entries")
        .select("id,wine_name,is_approved")
        .eq("team_id", existingTeam.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    const viewedEntry = (viewedEntryData ?? null) as EntryReference | null;
    const wineName = viewedEntry?.wine_name?.trim() ?? "";
    const hasWineName = wineName.length > 0;
    const isApproved = Boolean(viewedEntry?.is_approved);
    const approvalStatusLabel = viewedEntryError
        ? "Statut indisponible"
        : isApproved
          ? "Equipe validee"
          : "En attente de validation admin";
    const approvalStatusClassName = viewedEntryError
        ? "border-slate-300/50 bg-slate-400/15 text-slate-100"
        : isApproved
          ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
          : "border-amber-300/50 bg-amber-400/15 text-amber-100";

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

    // Charger TOUS les matchs pour déterminer les phases correctement
    const { data: allMatchesData, error: allMatchesError } = await supabase
        .from("matches")
        .select("id, team_home, team_away, match_date, stage")
        .order("match_date", { ascending: true });

    if (allMatchesError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Erreur de chargement
                    </h1>
                    <p className="mt-3 text-base leading-7 text-red-200">{allMatchesError.message}</p>
                </div>
            </div>
        );
    }

    const allMatches = ((allMatchesData ?? []) as MatchRow[]).sort((a, b) => {
        const aTime = a.match_date ? new Date(a.match_date).getTime() : 0;
        const bTime = b.match_date ? new Date(b.match_date).getTime() : 0;
        return aTime - bTime;
    });

    const matchesDataBasedOnPerformances = matchIds.length
        ? await supabase
              .from("matches")
              .select("id, team_home, team_away, match_date, stage")
              .in("id", matchIds)
        : { data: [], error: null };

    if (matchesDataBasedOnPerformances.error) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Erreur de chargement
                    </h1>
                    <p className="mt-3 text-base leading-7 text-red-200">{matchesDataBasedOnPerformances.error.message}</p>
                </div>
            </div>
        );
    }

    const matchesData = matchesDataBasedOnPerformances.data;

    // Charger les changements d'équipe
    const { data: teamChangesData, error: teamChangesError } = await supabase
        .from("team_changes")
        .select("player_out_id, player_in_id, created_at")
        .eq("team_id", existingTeam.id)
        .order("created_at", { ascending: true });

    if (teamChangesError) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Erreur
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Erreur de chargement
                    </h1>
                    <p className="mt-3 text-base leading-7 text-red-200">{teamChangesError.message}</p>
                </div>
            </div>
        );
    }

    const matches = ((matchesData ?? []) as MatchRow[]).sort((a, b) => {
        const aTime = a.match_date ? new Date(a.match_date).getTime() : 0;
        const bTime = b.match_date ? new Date(b.match_date).getTime() : 0;
        return aTime - bTime;
    });

    // ...existing code...

    const stageBuckets = new Map<string, { stageName: string; matchIds: string[]; sortTime: number }>();
    for (const match of allMatches) {
        const stageName = match.stage?.trim() || "Stage non defini";
        const stageKey = stageName.toLocaleLowerCase("fr-FR");
        const matchTime = match.match_date ? new Date(match.match_date).getTime() : Number.MAX_SAFE_INTEGER;
        const existingStage = stageBuckets.get(stageKey);

        if (existingStage) {
            existingStage.matchIds.push(match.id);
            existingStage.sortTime = Math.min(existingStage.sortTime, matchTime);
            continue;
        }

        stageBuckets.set(stageKey, {
            stageName,
            matchIds: [match.id],
            sortTime: matchTime,
        });
    }

    const stageColumns = [...stageBuckets.entries()]
        .sort((a, b) => a[1].sortTime - b[1].sortTime)
        .map(([stageKey, stage], index) => ({
            id: stageKey,
            label: `Match ${index + 1}`,
            stageName: stage.stageName,
            matchIds: stage.matchIds,
            stageIndex: index,
        }));

    // Créer une map des changements d'équipe
    const teamChanges = (teamChangesData ?? []) as Array<{
        player_out_id: string | null;
        player_in_id: string | null;
        created_at: string | null;
    }>;

    // Créer une map player -> stage index après lequel il entre
    const playerEntryStageIndex = new Map<string, number>();
    for (const change of teamChanges) {
        if (change.player_in_id) {
            // Le joueur entrant commence à partir de la 4e phase (index 3)
            playerEntryStageIndex.set(change.player_in_id, 3);
        }
    }

    // Créer une map player -> stage index jusqu'auquel il peut jouer
    const playerExitStageIndex = new Map<string, number>();
    for (const change of teamChanges) {
        if (change.player_out_id) {
            // Le joueur sortant joue jusqu'à la 3e phase incluse (index 2)
            playerExitStageIndex.set(change.player_out_id, 2);
        }
    }

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

    // Créer une map match -> stage index
    const matchToStageIndex = new Map<string, number>();
    for (const stage of stageColumns) {
        for (const matchId of stage.matchIds) {
            matchToStageIndex.set(matchId, stage.stageIndex);
        }
    }

    for (const performance of playerPerformances) {
        const position = positionByPlayerId.get(performance.player_id);

        if (!position) {
            continue;
        }

        // Déterminer si ce joueur peut compter ses points pour ce match
        const matchStageIndex = matchToStageIndex.get(performance.match_id) ?? 0;
        const exitStageIndex = playerExitStageIndex.get(performance.player_id);
        const entryStageIndex = playerEntryStageIndex.get(performance.player_id);

        // Si c'est un joueur sortant, il ne compte que jusqu'à la phase 3 (index 2)
        if (exitStageIndex !== undefined && matchStageIndex > exitStageIndex) {
            continue;
        }

        // Si c'est un joueur entrant, il ne compte que à partir de la phase 4 (index 3)
        if (entryStageIndex !== undefined && matchStageIndex < entryStageIndex) {
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

    const teamPointsRowsWithStageTotals = teamPointsRows.map((row) => {
        const byStage = stageColumns.reduce<Record<string, number>>((acc, stage) => {
            acc[stage.id] = stage.matchIds.reduce((sum, matchId) => sum + (row.byMatch[matchId] ?? 0), 0);
            return acc;
        }, {});

        return {
            ...row,
            byStage,
        };
    });

    const totalByMatch = matches.reduce<Record<string, number>>((acc, match) => {
        acc[match.id] = teamPointsRowsWithStageTotals.reduce((sum, row) => sum + (row.byMatch[match.id] ?? 0), 0);
        return acc;
    }, {});

    const totalByStage = stageColumns.reduce<Record<string, number>>((acc, stage) => {
        acc[stage.id] = teamPointsRowsWithStageTotals.reduce((sum, row) => sum + (row.byStage[stage.id] ?? 0), 0);
        return acc;
    }, {});

    const teamTotalPoints = teamPointsRowsWithStageTotals.reduce((sum, row) => sum + row.total, 0);

    const viewParams = new URLSearchParams();
    if (targetUserId) {
        viewParams.set("userId", targetUserId);
    }
    if (targetTeamId) {
        viewParams.set("teamId", targetTeamId);
    }

    const buildViewHref = (mode: PointsViewMode): string => {
        const params = new URLSearchParams(viewParams);
        params.set("view", mode);
        const query = params.toString();
        return query ? `/view-team?${query}` : "/view-team";
    };

    const getViewButtonClassName = (mode: PointsViewMode): string =>
        mode === pointsViewMode
            ? "rounded-full border border-yellow-200 bg-yellow-300 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-emerald-950"
            : "rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-emerald-50/80 transition hover:bg-white/15";

    const approveEntryAction = async (): Promise<void> => {
        "use server";
        await approveTeamEntry(existingTeam.id);
    };

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        {isOwnTeam ? "Mon équipe" : "Équipe de"}
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        {existingTeam.name}
                    </h1>
                    <p className="mt-1 text-lg text-emerald-50/60 font-semibold">{participantName}</p>
                    <p className="mt-2 text-base text-emerald-50/80">
                        Total de points : <span className="font-bold text-yellow-300">{teamTotalPoints}</span>
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] ${approvalStatusClassName}`}
                        >
                            {approvalStatusLabel}
                        </span>

                        {canApproveTeams && !isApproved ? (
                            <form action={approveEntryAction}>
                                <button
                                    type="submit"
                                    className="rounded-md bg-emerald-300 px-4 py-2 text-xs cursor-pointer font-black uppercase tracking-[0.12em] text-emerald-950 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                >
                                    Validation definitive
                                </button>
                            </form>
                        ) : null}
                    </div>
                    {isOwnTeam ? (
                        <div className="mt-4 rounded-lg border border-white/15 bg-white/10 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                                Bouteille mise en jeu
                            </p>
                            {viewedEntryError ? (
                                <p className="mt-2 text-sm font-semibold text-red-200">
                                    Impossible de charger la bouteille : {viewedEntryError.message}
                                </p>
                            ) : hasWineName ? (
                                <p className="mt-2 text-base font-bold text-yellow-300">{wineName}</p>
                            ) : (
                                <p className="mt-2 rounded-md border border-amber-300/50 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-100">
                                    Attention : tu n&apos;as pas encore renseigné de bouteille.
                                </p>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    {/* Terrain de foot */}
                    <div className="relative mx-auto aspect-[3/4] w-full max-w-[340px] rounded-lg border-4 border-white bg-gradient-to-b from-green-600 to-green-700 p-4 shadow-2xl shadow-black/50 sm:max-w-[390px] lg:max-w-[430px]">
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
                        {/*<div className="rounded-lg border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/20">*/}
                        {/*    <h2 className="text-xl font-black">Composition</h2>*/}
                        {/*    <div className="mt-4 space-y-3">*/}
                        {/*        <div className="flex items-center justify-between rounded-md border border-red-500/50 bg-red-500/15 px-3 py-2">*/}
                        {/*            <span className="text-sm font-semibold">Gardiens</span>*/}
                        {/*            <span className="font-black text-red-300">1</span>*/}
                        {/*        </div>*/}
                        {/*        <div className="flex items-center justify-between rounded-md border border-blue-500/50 bg-blue-500/15 px-3 py-2">*/}
                        {/*            <span className="text-sm font-semibold">Défenseurs</span>*/}
                        {/*            <span className="font-black text-blue-300">4</span>*/}
                        {/*        </div>*/}
                        {/*        <div className="flex items-center justify-between rounded-md border border-purple-500/50 bg-purple-500/15 px-3 py-2">*/}
                        {/*            <span className="text-sm font-semibold">Milieux</span>*/}
                        {/*            <span className="font-black text-purple-300">3</span>*/}
                        {/*        </div>*/}
                        {/*        <div className="flex items-center justify-between rounded-md border border-yellow-500/50 bg-yellow-500/15 px-3 py-2">*/}
                        {/*            <span className="text-sm font-semibold">Attaquants</span>*/}
                        {/*            <span className="font-black text-yellow-300">3</span>*/}
                        {/*        </div>*/}
                        {/*    </div>*/}
                        {/*</div>*/}

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
                    </div>
                </div>

                <div className="mt-8 rounded-lg border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/20">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-xl font-black">Recapitulatif des points</h2>
                        <div className="flex flex-wrap gap-2">
                            <Link href={buildViewHref("match")} className={getViewButtonClassName("match")}>
                                Par match
                            </Link>
                            <Link href={buildViewHref("stage")} className={getViewButtonClassName("stage")}>
                                Par stage
                            </Link>
                            <Link href={buildViewHref("total")} className={getViewButtonClassName("total")}>
                                Total
                            </Link>
                        </div>
                    </div>
                    {pointsViewMode !== "total" && matches.length === 0 ? (
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
                                        {pointsViewMode === "match"
                                            ? matches.map((match) => (
                                                  <th key={match.id} className="min-w-[120px] px-2 py-2 text-center sm:min-w-[140px] sm:px-3">
                                                      <div className="font-semibold text-white">
                                                          {match.team_home} - {match.team_away}
                                                      </div>
                                                  </th>
                                              ))
                                            : null}
                                        {pointsViewMode === "stage"
                                            ? stageColumns.map((stage) => (
                                                  <th key={stage.id} className="min-w-[120px] px-2 py-2 text-center sm:min-w-[140px] sm:px-3">
                                                      <div className="font-semibold text-white">{stage.label}</div>
                                                      <div className="text-xs text-emerald-50/70">{stage.stageName}</div>
                                                  </th>
                                              ))
                                            : null}
                                        <th className="px-3 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {teamPointsRowsWithStageTotals.map((row) => (
                                        <tr key={row.id}>
                                            <td className="sticky left-0 z-10 bg-emerald-950/70 px-3 py-2 font-semibold">
                                                {row.name}
                                            </td>
                                            <td className="px-3 py-2 text-emerald-50/80">{row.position}</td>
                                            {pointsViewMode === "match"
                                                ? matches.map((match) => {
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
                                                  })
                                                : null}
                                            {pointsViewMode === "stage"
                                                ? stageColumns.map((stage) => {
                                                      const stagePoints = row.byStage[stage.id] ?? 0;
                                                      const pointsColor =
                                                          stagePoints > 0
                                                              ? "text-emerald-300"
                                                              : stagePoints < 0
                                                                ? "text-red-300"
                                                                : "text-emerald-50/70";

                                                      return (
                                                          <td key={`${row.id}-${stage.id}`} className={`px-2 py-2 text-center font-semibold sm:px-3 ${pointsColor}`}>
                                                              {formatPoints(stagePoints)}
                                                          </td>
                                                      );
                                                  })
                                                : null}
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
                                        {pointsViewMode === "match"
                                            ? matches.map((match) => (
                                                  <td key={`total-${match.id}`} className="px-2 py-2 text-center font-black text-yellow-300 sm:px-3">
                                                      {formatPoints(totalByMatch[match.id] ?? 0)}
                                                  </td>
                                              ))
                                            : null}
                                        {pointsViewMode === "stage"
                                            ? stageColumns.map((stage) => (
                                                  <td key={`total-${stage.id}`} className="px-2 py-2 text-center font-black text-yellow-300 sm:px-3">
                                                      {formatPoints(totalByStage[stage.id] ?? 0)}
                                                  </td>
                                              ))
                                            : null}
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
