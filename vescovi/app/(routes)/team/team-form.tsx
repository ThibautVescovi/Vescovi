"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { saveTeam, type SaveTeamResult, type TeamSelectionPayload } from "./actions";

type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";

type PlayerSlot = {
    id: string;
    position: Position;
    label: string;
};

type SlotSelection = {
    countryCode: string;
    playerId: string;
};

export type InitialSelection = SlotSelection & {
    slotId: string;
    position: Position;
};

export type Player = {
    id: string;
    name: string;
    country_code: string;
    position: string;
};

export type Country = {
    code: string;
    name: string;
};

type TeamFormProps = {
    players: Player[];
    countries: Country[];
    initialSelections: InitialSelection[];
    initialWineName: string;
    initialTeamName: string;
    loadError: string | null;
};

const playerSlots: PlayerSlot[] = [
    { id: "gk-1", position: "Gardien", label: "Gardien" },
    { id: "def-1", position: "Défenseur", label: "Défenseur 1" },
    { id: "def-2", position: "Défenseur", label: "Défenseur 2" },
    { id: "def-3", position: "Défenseur", label: "Défenseur 3" },
    { id: "def-4", position: "Défenseur", label: "Défenseur 4" },
    { id: "mid-1", position: "Milieu", label: "Milieu 1" },
    { id: "mid-2", position: "Milieu", label: "Milieu 2" },
    { id: "mid-3", position: "Milieu", label: "Milieu 3" },
    { id: "att-1", position: "Attaquant", label: "Attaquant 1" },
    { id: "att-2", position: "Attaquant", label: "Attaquant 2" },
    { id: "att-3", position: "Attaquant", label: "Attaquant 3" },
];

function buildSelections(initialSelections: InitialSelection[]) {
    const nextSelections = Object.fromEntries(
        playerSlots.map((slot) => [slot.id, { countryCode: "", playerId: "" }]),
    ) as Record<string, SlotSelection>;

    for (const selection of initialSelections) {
        if (nextSelections[selection.slotId]) {
            nextSelections[selection.slotId] = {
                countryCode: selection.countryCode,
                playerId: selection.playerId,
            };
        }
    }

    return nextSelections;
}

const rules = [
    "11 joueurs",
    "1 gardien",
    "4 défenseurs",
    "3 milieux",
    "3 attaquants",
    "Au minimum 5 nationalités",
    "Au maximum 3 joueurs par nationalité",
];

function normalizeText(value: string) {
    return value
        .trim()
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizePosition(value: string): Position | null {
    const position = normalizeText(value);

    if (
        ["g", "gb", "gk", "goalkeeper", "keeper", "gardien"].includes(position) ||
        position.includes("gardien")
    ) {
        return "Gardien";
    }

    if (
        ["d", "df", "def", "defenseur", "defender", "defence", "defense"].includes(position) ||
        position.includes("defenseur") ||
        position.includes("defender")
    ) {
        return "Défenseur";
    }

    if (
        ["m", "mf", "mid", "milieu", "midfield", "midfielder"].includes(position) ||
        position.includes("milieu") ||
        position.includes("midfield")
    ) {
        return "Milieu";
    }

    if (
        ["a", "fw", "fwd", "att", "attaquant", "attack", "attacker", "forward"].includes(
            position,
        ) ||
        position.includes("attaquant") ||
        position.includes("forward")
    ) {
        return "Attaquant";
    }

    return null;
}

export default function TeamForm({
    players,
    countries,
    initialSelections,
    initialWineName,
    initialTeamName,
    loadError,
}: TeamFormProps) {
    const [selections, setSelections] = useState<Record<string, SlotSelection>>(() => {
        return buildSelections(initialSelections);
    });
    const [saveResult, setSaveResult] = useState<SaveTeamResult | null>(null);
    const [wineName, setWineName] = useState(initialWineName);
    const [teamName, setTeamName] = useState(initialTeamName);
    const [isSaving, startSaving] = useTransition();
    const playersById = useMemo(
        () => new Map(players.map((player) => [player.id, player])),
        [players],
    );

    const countryNamesByCode = useMemo(
        () => new Map(countries.map((country) => [country.code, country.name])),
        [countries],
    );

    const selectedPlayerIds = useMemo(
        () => new Set(Object.values(selections).map((selection) => selection.playerId).filter(Boolean)),
        [selections],
    );

    const countriesWithPlayers = useMemo(() => {
        const countryCodes = new Set(players.map((player) => player.country_code).filter(Boolean));

        return Array.from(countryCodes)
            .map((code) => ({
                code,
                name: countryNamesByCode.get(code) ?? code,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "fr-FR"));
    }, [countryNamesByCode, players]);

    const stats = useMemo(() => {
        const selected = Object.values(selections)
            .map((selection) => playersById.get(selection.playerId))
            .filter((player): player is Player => Boolean(player));

        const nationalities = selected.reduce<Record<string, number>>((acc, player) => {
            if (!player.country_code) {
                return acc;
            }

            acc[player.country_code] = (acc[player.country_code] ?? 0) + 1;
            return acc;
        }, {});

        const nationalityCount = Object.keys(nationalities).length;
        const overLimitNationalities = Object.entries(nationalities)
            .filter(([, count]) => count > 3)
            .map(([countryCode]) => countryNamesByCode.get(countryCode) ?? countryCode);

        return {
            completedCount: selected.length,
            nationalityCount,
            overLimitNationalities,
            isComplete: selected.length === playerSlots.length,
            hasEnoughNationalities: nationalityCount >= 5,
            respectsNationalityLimit: overLimitNationalities.length === 0,
            hasUniquePlayers: selected.length === selectedPlayerIds.size,
        };
    }, [countryNamesByCode, playersById, selectedPlayerIds.size, selections]);

    const canSubmit =
        stats.isComplete &&
        stats.hasEnoughNationalities &&
        stats.respectsNationalityLimit &&
        stats.hasUniquePlayers;

    function updateCountry(slotId: string, countryCode: string) {
        setSaveResult(null);
        setSelections((current) => ({
            ...current,
            [slotId]: {
                countryCode,
                playerId: "",
            },
        }));
    }

    function updatePlayer(slotId: string, playerId: string) {
        const player = playersById.get(playerId);

        setSaveResult(null);
        setSelections((current) => ({
            ...current,
            [slotId]: {
                countryCode: player?.country_code ?? current[slotId].countryCode,
                playerId,
            },
        }));
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const payload: TeamSelectionPayload[] = playerSlots.map((slot) => ({
            slotId: slot.id,
            position: slot.position,
            playerId: selections[slot.id].playerId,
        }));

        startSaving(async () => {
            const result = await saveTeam(payload, wineName, teamName);
            setSaveResult(result);
        });
    }

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <section className="min-w-0">
                    <div className="mb-6">
                        <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                            Création d&apos;équipe
                        </p>
                        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                            Mon équipe
                        </h1>
                        <p className="mt-3 max-w-3xl text-base leading-7 text-emerald-50/80">
                            Compose ton XI de départ pour le concours. Chaque parieur engage une
                            bouteille de vin de 10€, puis les bouteilles sont réparties entre les
                            trois premiers selon le nombre de participants.
                        </p>
                    </div>

                    {loadError ? (
                        <div className="mb-4 rounded-lg border border-red-300/50 bg-red-500/15 p-4 text-sm font-semibold text-red-100">
                            Impossible de récupérer les joueurs et pays depuis Supabase : {loadError}
                        </div>
                    ) : null}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur">
                            <label className="block">
                                <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                                    Nom de l&apos;équipe
                                </span>
                                <input
                                    type="text"
                                    value={teamName}
                                    onChange={(event) => {
                                        setSaveResult(null);
                                        setTeamName(event.target.value);
                                    }}
                                    placeholder="Ex: Les Etoiles du Mondial"
                                    className="mt-2 w-full rounded-md border border-white/15 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60"
                                />
                            </label>
                        </div>

                        <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur">
                            <label className="block">
                                <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                                    Bouteille mise en jeu
                                </span>
                                <input
                                    type="text"
                                    value={wineName}
                                    onChange={(event) => {
                                        setSaveResult(null);
                                        setWineName(event.target.value);
                                    }}
                                    placeholder="Ex: Cotes-du-Rhone 2022"
                                    className="mt-2 w-full rounded-md border border-white/15 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60"
                                />
                            </label>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-white/15 bg-white/10 shadow-2xl shadow-black/25 backdrop-blur">
                            <div className="hidden grid-cols-[150px_minmax(0,240px)_minmax(0,1fr)] gap-3 border-b border-white/10 bg-emerald-950/60 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-100 md:grid">
                                <span>Poste</span>
                                <span>Nationalité</span>
                                <span>Joueur</span>
                            </div>

                            <div className="divide-y divide-white/10">
                                {playerSlots.map((slot) => {
                                    const selection = selections[slot.id];
                                    const selectedCountryCode = selection.countryCode;
                                    const availablePlayers = players.filter((player) => {
                                        const matchesPosition =
                                            normalizePosition(player.position) === slot.position;
                                        const matchesCountry =
                                            !selectedCountryCode ||
                                            player.country_code === selectedCountryCode;
                                        const isAlreadySelected =
                                            selectedPlayerIds.has(player.id) &&
                                            selection.playerId !== player.id;

                                        return matchesPosition && matchesCountry && !isAlreadySelected;
                                    });
                                    const availableCountryCodes = new Set(
                                        players
                                            .filter(
                                                (player) =>
                                                    normalizePosition(player.position) === slot.position,
                                            )
                                            .map((player) => player.country_code)
                                            .filter(Boolean),
                                    );
                                    const availableCountries = countriesWithPlayers.filter((country) =>
                                        availableCountryCodes.has(country.code),
                                    );
                                    const hasCountry = Boolean(selectedCountryCode);

                                    return (
                                        <div
                                            key={slot.id}
                                            className="grid gap-3 px-4 py-4 md:grid-cols-[150px_minmax(0,240px)_minmax(0,1fr)] md:items-center"
                                        >
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/70 md:hidden">
                                                    Poste
                                                </p>
                                                <div className="mt-1 flex items-center gap-2 md:mt-0">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-xs font-black text-green-950">
                                                        {slot.position === "Gardien"
                                                            ? "G"
                                                            : slot.position === "Défenseur"
                                                              ? "D"
                                                              : slot.position === "Milieu"
                                                                ? "M"
                                                                : "A"}
                                                    </span>
                                                    <span className="font-bold">{slot.label}</span>
                                                </div>
                                            </div>

                                            <label className="block">
                                                <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/70 md:hidden">
                                                    Nationalité
                                                </span>
                                                <select
                                                    value={selection.countryCode}
                                                    onChange={(event) =>
                                                        updateCountry(slot.id, event.target.value)
                                                    }
                                                    className="mt-1 w-full rounded-md border border-white/15 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60 md:mt-0"
                                                >
                                                    <option value="">Choisir un pays</option>
                                                    {availableCountries.map((country) => (
                                                        <option key={country.code} value={country.code}>
                                                            {country.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>

                                            <label className="block">
                                                <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/70 md:hidden">
                                                    Joueur
                                                </span>
                                                <select
                                                    value={selection.playerId}
                                                    onChange={(event) =>
                                                        updatePlayer(slot.id, event.target.value)
                                                    }
                                                    disabled={!hasCountry}
                                                    className="mt-1 w-full rounded-md border border-white/15 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 md:mt-0"
                                                >
                                                    <option value="">
                                                        {hasCountry
                                                            ? "Sélectionner un joueur"
                                                            : "Choisir un pays d'abord"}
                                                    </option>
                                                    {availablePlayers.map((player) => (
                                                        <option key={player.id} value={player.id}>
                                                            {player.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 rounded-lg border border-white/15 bg-emerald-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold text-emerald-50/85">
                                {saveResult
                                    ? saveResult.message
                                    : canSubmit
                                      ? "Toutes les règles sont respectées."
                                      : "Choisis une nationalité puis un joueur pour chaque poste."}
                            </p>
                            <button
                                type="submit"
                                disabled={!canSubmit || isSaving}
                                className="rounded-md bg-yellow-300 px-5 py-3 text-sm font-black text-green-950 shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                            >
                                {isSaving ? "Sauvegarde..." : "Valider mon équipe"}
                            </button>
                        </div>
                    </form>
                </section>

                <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
                    <section className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-5 shadow-xl shadow-black/20">
                        <h2 className="text-xl font-black text-yellow-100">Rappel des règles</h2>
                        <ul className="mt-4 space-y-3">
                            {rules.map((rule) => (
                                <li
                                    key={rule}
                                    className="flex gap-3 text-sm font-semibold text-emerald-50/90"
                                >
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-[11px] font-black text-green-950">
                                        ✓
                                    </span>
                                    <span>{rule}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="rounded-lg border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/20">
                        <h2 className="text-xl font-black">Contrôle</h2>
                        <div className="mt-4 space-y-3">
                            <RuleStatus
                                valid={stats.completedCount === 11}
                                label={`${stats.completedCount}/11 joueurs complétés`}
                            />
                            <RuleStatus
                                valid={stats.hasEnoughNationalities}
                                label={`${stats.nationalityCount}/5 nationalités minimum`}
                            />
                            <RuleStatus
                                valid={stats.respectsNationalityLimit}
                                label="Maximum 3 joueurs par nationalité"
                            />
                        </div>

                        {stats.overLimitNationalities.length > 0 ? (
                            <p className="mt-4 rounded-md border border-red-300/50 bg-red-500/15 p-3 text-sm font-semibold text-red-100">
                                Trop de joueurs pour : {stats.overLimitNationalities.join(", ")}.
                            </p>
                        ) : null}
                    </section>
                </aside>
            </div>
        </div>
    );
}

function RuleStatus({ valid, label }: { valid: boolean; label: string }) {
    return (
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-emerald-950/45 px-3 py-3">
            <span
                className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black",
                    valid ? "bg-emerald-300 text-green-950" : "bg-white/15 text-emerald-50/70",
                ].join(" ")}
            >
                {valid ? "✓" : "!"}
            </span>
            <span className="text-sm font-bold text-emerald-50/90">{label}</span>
        </div>
    );
}
