"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    createMatch,
    savePointsForMatch,
    type PlayerPointInput,
    type SavePointsResult,
} from "./actions";

type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";
type Appearance = "none" | "full" | "subbed_out" | "subbed_in";

type Player = {
    id: string;
    name: string;
    country_code: string;
    position: string;
};

type Country = {
    code: string;
    name: string;
};

type ExistingPoint = {
    player_id: string;
    goals: number | null;
    goals_conceded: number | null;
    played_full_match: boolean | null;
    is_starter: boolean | null;
    is_substitute_in: boolean | null;
    yellow_cards: number | null;
    red_cards: number | null;
};

type Match = {
    id: string;
    team_home: string;
    team_away: string;
    match_date: string | null;
    stage: string | null;
    home_score: number | null;
    away_score: number | null;
};

type RowState = {
    goals: number;
    goalsConceded: number;
    yellowCards: number;
    redCards: number;
    appearance: Appearance;
};

const STAGE_OPTIONS = [
    "Match 1",
    "Match 2",
    "Match 3",
    "Huitièmes",
    "Quarts",
    "Demis",
    "Finales",
] as const;

type StageOption = (typeof STAGE_OPTIONS)[number];

function hasPlayed(appearance: Appearance) {
    return appearance !== "none";
}

type PointsFormProps = {
    players: Player[];
    countries: Country[];
    matches: Match[];
    existingPoints: ExistingPoint[];
    selectedMatchId: string;
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

    if (["g", "gb", "gk", "goalkeeper", "keeper", "gardien"].includes(position)) {
        return "Gardien";
    }

    if (["d", "df", "def", "defenseur", "defender", "defence", "defense"].includes(position)) {
        return "Défenseur";
    }

    if (["m", "mf", "mid", "milieu", "midfield", "midfielder"].includes(position)) {
        return "Milieu";
    }

    if (["a", "fw", "fwd", "att", "attaquant", "attack", "attacker", "forward"].includes(position)) {
        return "Attaquant";
    }

    if (position.includes("gardien")) {
        return "Gardien";
    }

    if (position.includes("defenseur") || position.includes("defender")) {
        return "Défenseur";
    }

    if (position.includes("milieu") || position.includes("midfield")) {
        return "Milieu";
    }

    if (position.includes("attaquant") || position.includes("forward")) {
        return "Attaquant";
    }

    return null;
}

function defaultRowState(): RowState {
    return {
        goals: 0,
        goalsConceded: 0,
        yellowCards: 0,
        redCards: 0,
        appearance: "none",
    };
}

function computePoints(position: Position, row: RowState) {
    const goalsPoints = row.goals * 5;
    const cardPoints = row.yellowCards * -2 + row.redCards * -5;
    const appearancePoints = row.appearance === "full" ? 2 : row.appearance === "none" ? 0 : 1;
    const cleanSheet = hasPlayed(row.appearance) && row.goalsConceded === 0;
    const defensivePoints =
        position === "Gardien"
            ? (cleanSheet ? 5 : 0) - row.goalsConceded
            : position === "Défenseur"
              ? (cleanSheet ? 2 : 0) - row.goalsConceded
              : 0;

    return goalsPoints + cardPoints + appearancePoints + defensivePoints;
}

function formatMatchLabel(match: Match, countriesByCode: Map<string, string>) {
    const kickoffDate = new Date(match.match_date ?? "");
    const homeLabel = countriesByCode.get(match.team_home) ?? match.team_home;
    const awayLabel = countriesByCode.get(match.team_away) ?? match.team_away;
    const dateLabel = Number.isNaN(kickoffDate.getTime())
        ? "Date inconnue"
        : kickoffDate.toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          });

    return `${homeLabel} vs ${awayLabel} - ${dateLabel}`;
}

function getDatetimeLocalDefault() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    const hours = `${now.getHours()}`.padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:00`;
}

export default function PointsForm({
    players,
    countries,
    matches,
    existingPoints,
    selectedMatchId,
}: PointsFormProps) {
    const router = useRouter();
    const [currentMatchId, setCurrentMatchId] = useState(selectedMatchId);
    const [countryFilter, setCountryFilter] = useState("ALL");
    const [positionFilter, setPositionFilter] = useState<Position | "ALL">("ALL");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<SavePointsResult | null>(null);
    const [newHomeTeam, setNewHomeTeam] = useState(() => countries[0]?.code ?? "");
    const [newAwayTeam, setNewAwayTeam] = useState(() => countries[1]?.code ?? countries[0]?.code ?? "");
    const [newKickoffAt, setNewKickoffAt] = useState(getDatetimeLocalDefault());
    const [newStage, setNewStage] = useState<StageOption>(STAGE_OPTIONS[0]);

    const countriesByCode = useMemo(
        () => new Map(countries.map((country) => [country.code, country.name])),
        [countries],
    );

    const sortedCountries = useMemo(
        () => countries.slice().sort((a, b) => a.name.localeCompare(b.name, "fr-FR")),
        [countries],
    );

    const initialRows = useMemo(() => {
        const rows = new Map<string, RowState>();

        for (const existing of existingPoints) {
            rows.set(existing.player_id, {
                goals: existing.goals ?? 0,
                goalsConceded: existing.goals_conceded ?? 0,
                yellowCards: existing.yellow_cards ?? 0,
                redCards: existing.red_cards ?? 0,
                appearance: existing.played_full_match
                    ? "full"
                    : existing.is_substitute_in
                      ? "subbed_in"
                      : existing.is_starter
                        ? "subbed_out"
                        : "none",
            });
        }

        return rows;
    }, [existingPoints]);

    const [rows, setRows] = useState<Map<string, RowState>>(initialRows);

    const selectedMatch = useMemo(
        () => matches.find((match) => match.id === currentMatchId) ?? null,
        [currentMatchId, matches],
    );

    const canEditPoints = Boolean(selectedMatch);

    const selectedMatchCountryCodes = useMemo(() => {
        if (!selectedMatch) {
            return new Set<string>();
        }

        return new Set([selectedMatch.team_home, selectedMatch.team_away]);
    }, [selectedMatch]);

    const playersWithMeta = useMemo(() => {
        return players
            .map((player) => ({
                ...player,
                normalizedPosition: normalizePosition(player.position),
                countryName: countriesByCode.get(player.country_code) ?? player.country_code,
            }))
            .filter((player) => Boolean(player.normalizedPosition))
            .sort((a, b) => {
                const byCountry = a.countryName.localeCompare(b.countryName, "fr-FR");

                if (byCountry !== 0) {
                    return byCountry;
                }

                const order = ["Gardien", "Défenseur", "Milieu", "Attaquant"];
                const byPosition =
                    order.indexOf(a.normalizedPosition as Position) -
                    order.indexOf(b.normalizedPosition as Position);

                if (byPosition !== 0) {
                    return byPosition;
                }

                return a.name.localeCompare(b.name, "fr-FR");
            });
    }, [countriesByCode, players]);

    const filteredPlayers = useMemo(() => {
        if (!canEditPoints) {
            return [];
        }

        return playersWithMeta.filter((player) => {
            const inSelectedMatchCountries = selectedMatchCountryCodes.has(player.country_code);
            const countryOk = countryFilter === "ALL" || player.country_code === countryFilter;
            const positionOk =
                positionFilter === "ALL" || player.normalizedPosition === positionFilter;
            return inSelectedMatchCountries && countryOk && positionOk;
        });
    }, [canEditPoints, countryFilter, playersWithMeta, positionFilter, selectedMatchCountryCodes]);

    const editedCount = useMemo(() => {
        let total = 0;

        for (const player of playersWithMeta) {
            const row = rows.get(player.id) ?? defaultRowState();
            const hasData =
                row.goals > 0 ||
                row.goalsConceded > 0 ||
                row.yellowCards > 0 ||
                row.redCards > 0 ||
                row.appearance !== "none";

            if (hasData) {
                total += 1;
            }
        }

        return total;
    }, [playersWithMeta, rows]);

    function updateRow(playerId: string, patch: Partial<RowState>) {
        setResult(null);
        setRows((current) => {
            const next = new Map(current);
            const currentRow = next.get(playerId) ?? defaultRowState();
            next.set(playerId, {
                ...currentRow,
                ...patch,
            });
            return next;
        });
    }

    function clampInput(value: string, max: number) {
        const parsed = Number.parseInt(value, 10);

        if (Number.isNaN(parsed) || parsed < 0) {
            return 0;
        }

        if (parsed > max) {
            return max;
        }

        return parsed;
    }

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!currentMatchId || !selectedMatch) {
            setResult({ ok: false, message: "Crée ou sélectionne un match avant de saisir des points." });
            return;
        }

        const payload: PlayerPointInput[] = playersWithMeta.map((player) => {
            const row = rows.get(player.id) ?? defaultRowState();

            return {
                playerId: player.id,
                position: player.normalizedPosition as Position,
                goals: row.goals,
                goalsConceded: row.goalsConceded,
                yellowCards: row.yellowCards,
                redCards: row.redCards,
                appearance: row.appearance,
            };
        });

        startTransition(async () => {
            const saveResult = await savePointsForMatch(currentMatchId, payload);
            setResult(saveResult);
        });
    }

    function onChangeMatch(nextMatchId: string) {
        setCurrentMatchId(nextMatchId);
        setResult(null);
        const query = nextMatchId ? `?matchId=${encodeURIComponent(nextMatchId)}` : "";
        router.push(`/admin/points${query}`);
    }

    function onCreateMatch() {
        setResult(null);

        if (!newHomeTeam || !newAwayTeam) {
            setResult({ ok: false, message: "Choisis les deux pays du match." });
            return;
        }

        if (newHomeTeam === newAwayTeam) {
            setResult({ ok: false, message: "Domicile et exterieure doivent etre differents." });
            return;
        }

        startTransition(async () => {
            const creationResult = await createMatch({
                homeTeam: newHomeTeam,
                awayTeam: newAwayTeam,
                kickoffAt: newKickoffAt,
                stage: newStage,
            });

            setResult({ ok: creationResult.ok, message: creationResult.message });

            if (creationResult.ok && creationResult.matchId) {
                setNewHomeTeam(countries[0]?.code ?? "");
                setNewAwayTeam(countries[1]?.code ?? countries[0]?.code ?? "");
                setNewStage(STAGE_OPTIONS[0]);
                onChangeMatch(creationResult.matchId);
            }
        });
    }

    const selectedMatchSummary = selectedMatch
        ? [selectedMatch.stage, selectedMatch.home_score, selectedMatch.away_score]
              .filter((value) => value !== null && value !== undefined && value !== "")
              .join(" • ")
        : null;

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-xl shadow-black/20">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">Administration</p>
                    <h1 className="mt-2 text-3xl font-black sm:text-4xl">Saisie des points joueurs</h1>
                    <p className="mt-3 max-w-4xl text-sm text-emerald-50/85">
                        Affichage trié par pays puis poste pour accélérer la saisie après les matchs. Tu peux
                        filtrer rapidement avant de renseigner les stats.
                    </p>
                </section>

                <form onSubmit={onSubmit} className="space-y-4">
                    <section className="rounded-lg border border-white/15 bg-emerald-950/50 p-4">
                        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr] lg:items-end">
                            <label className="text-sm font-semibold">
                                Match
                                <select
                                    value={currentMatchId}
                                    onChange={(event) => onChangeMatch(event.target.value)}
                                    className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                >
                                    {matches.length === 0 ? <option value="">Aucun match</option> : null}
                                    {matches.map((match) => (
                                        <option key={match.id} value={match.id}>
                                            {formatMatchLabel(match, countriesByCode)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold">
                                Joueurs saisis: <span className="text-yellow-200">{editedCount}</span>
                                <p className="mt-1 text-xs text-emerald-100/80">Les lignes sans stat restent a 0 point.</p>
                            </div>

                            <div className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-emerald-100">
                                {selectedMatch ? (
                                    <div className="space-y-1">
                                        <span className="block">Edition active: {formatMatchLabel(selectedMatch, countriesByCode)}</span>
                                        {selectedMatchSummary ? <span className="block text-emerald-200/80">{selectedMatchSummary}</span> : null}
                                    </div>
                                ) : (
                                    <span>Crée un match pour commencer la saisie.</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <label className="text-sm font-semibold">
                                Equipe domicile
                                <select
                                    value={newHomeTeam}
                                    onChange={(event) => setNewHomeTeam(event.target.value)}
                                    className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                >
                                    {sortedCountries.map((country) => (
                                        <option key={`home-${country.code}`} value={country.code}>
                                            {country.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm font-semibold">
                                Equipe exterieure
                                <select
                                    value={newAwayTeam}
                                    onChange={(event) => setNewAwayTeam(event.target.value)}
                                    className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                >
                                    {sortedCountries.map((country) => (
                                        <option key={`away-${country.code}`} value={country.code}>
                                            {country.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm font-semibold">
                                Coup d&apos;envoi
                                <input
                                    type="datetime-local"
                                    value={newKickoffAt}
                                    onChange={(event) => setNewKickoffAt(event.target.value)}
                                    className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                />
                            </label>
                            <label className="text-sm font-semibold">
                                Phase
                                <select
                                    value={newStage}
                                    onChange={(event) => setNewStage(event.target.value as StageOption)}
                                    className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                >
                                    {STAGE_OPTIONS.map((stage) => (
                                        <option key={stage} value={stage}>
                                            {stage}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={onCreateMatch}
                                disabled={isPending}
                                className="h-fit rounded-md bg-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Creer le match
                            </button>
                        </div>
                    </section>

                    <section className="grid gap-3 rounded-lg border border-white/15 bg-emerald-950/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-sm font-semibold">
                            Filtre pays
                            <select
                                value={countryFilter}
                                onChange={(event) => setCountryFilter(event.target.value)}
                                disabled={!canEditPoints}
                                className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                            >
                                <option value="ALL">Tous les pays</option>
                                {countries
                                    .slice()
                                    .sort((a, b) => a.name.localeCompare(b.name, "fr-FR"))
                                    .map((country) => (
                                        <option key={country.code} value={country.code}>
                                            {country.name}
                                        </option>
                                    ))}
                            </select>
                        </label>

                        <label className="text-sm font-semibold">
                            Filtre poste
                            <select
                                value={positionFilter}
                                onChange={(event) => setPositionFilter(event.target.value as Position | "ALL")}
                                disabled={!canEditPoints}
                                className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                            >
                                <option value="ALL">Tous les postes</option>
                                <option value="Gardien">Gardien</option>
                                <option value="Défenseur">Défenseur</option>
                                <option value="Milieu">Milieu</option>
                                <option value="Attaquant">Attaquant</option>
                            </select>
                        </label>

                        <div className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-emerald-100/85">
                            Clean sheet automatique pour gardiens et défenseurs ayant joué avec 0 but encaissé.
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-lg border border-white/15 bg-white/10 shadow-2xl shadow-black/20">
                        {!canEditPoints ? (
                            <div className="border-b border-white/10 bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-amber-200">
                                Crée ou sélectionne un match pour commencer la saisie des points.
                            </div>
                        ) : null}
                        <div className="overflow-x-auto">
                            <table className="min-w-[1050px] w-full text-left text-sm">
                                <thead className="bg-emerald-950/70 text-xs uppercase tracking-[0.16em] text-emerald-100">
                                    <tr>
                                        <th className="px-3 py-3">Pays</th>
                                        <th className="px-3 py-3">Poste</th>
                                        <th className="px-3 py-3">Joueur</th>
                                        <th className="px-3 py-3">Buts</th>
                                        <th className="px-3 py-3">Buts encaissés</th>
                                        <th className="px-3 py-3">CJ</th>
                                        <th className="px-3 py-3">CR</th>
                                        <th className="px-3 py-3">Présence</th>
                                        <th className="px-3 py-3">Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {canEditPoints && filteredPlayers.length === 0 ? (
                                        <tr className="bg-white/5">
                                            <td colSpan={9} className="px-3 py-4 text-center text-sm text-emerald-100/85">
                                                Aucun joueur ne correspond aux pays du match et aux filtres actifs.
                                            </td>
                                        </tr>
                                    ) : null}
                                    {filteredPlayers.map((player) => {
                                        const row = rows.get(player.id) ?? defaultRowState();
                                        const position = player.normalizedPosition as Position;
                                        const playerPoints = computePoints(position, row);

                                        return (
                                            <tr key={player.id} className="bg-white/5">
                                                <td className="px-3 py-2">{player.countryName}</td>
                                                <td className="px-3 py-2">{position}</td>
                                                <td className="px-3 py-2 font-semibold">{player.name}</td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={10}
                                                        value={row.goals}
                                                        onChange={(event) =>
                                                            updateRow(player.id, {
                                                                goals: clampInput(event.target.value, 10),
                                                            })
                                                        }
                                                        className="w-20 rounded border border-white/20 bg-white px-2 py-1 text-slate-900"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={15}
                                                        value={row.goalsConceded}
                                                        onChange={(event) =>
                                                            updateRow(player.id, {
                                                                goalsConceded: clampInput(event.target.value, 15),
                                                            })
                                                        }
                                                        className="w-24 rounded border border-white/20 bg-white px-2 py-1 text-slate-900 disabled:bg-slate-200"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={2}
                                                        value={row.yellowCards}
                                                        onChange={(event) =>
                                                            updateRow(player.id, {
                                                                yellowCards: clampInput(event.target.value, 2),
                                                            })
                                                        }
                                                        className="w-16 rounded border border-white/20 bg-white px-2 py-1 text-slate-900"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={1}
                                                        value={row.redCards}
                                                        onChange={(event) =>
                                                            updateRow(player.id, {
                                                                redCards: clampInput(event.target.value, 1),
                                                            })
                                                        }
                                                        className="w-16 rounded border border-white/20 bg-white px-2 py-1 text-slate-900"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={row.appearance}
                                                        onChange={(event) =>
                                                            updateRow(player.id, {
                                                                appearance: event.target.value as RowState["appearance"],
                                                            })
                                                        }
                                                        className="rounded border border-white/20 bg-white px-2 py-1 text-slate-900"
                                                    >
                                                        <option value="none">Non entré</option>
                                                        <option value="full">Match complet</option>
                                                        <option value="subbed_out">Remplacé</option>
                                                        <option value="subbed_in">Entrant</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 font-black text-yellow-200">{playerPoints}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="flex flex-col gap-3 rounded-lg border border-white/15 bg-emerald-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-emerald-50/90">
                            {result ? result.message : "Saisie rapide: trie par pays puis poste, puis valide une fois."}
                        </p>
                        <button
                            type="submit"
                            disabled={isPending || !canEditPoints}
                            className="rounded-md bg-yellow-300 px-5 py-3 text-sm font-black text-green-950 shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                        >
                            {isPending ? "Enregistrement..." : "Enregistrer les points"}
                        </button>
                    </section>
                </form>
            </div>
        </div>
    );
}


