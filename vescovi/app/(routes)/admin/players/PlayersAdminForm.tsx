"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    createPlayer,
    deletePlayer,
    savePlayersBatch,
    type PlayerMutationResult,
} from "./actions";

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

type PositionCode = "GK" | "DEF" | "MID" | "FWD";

type EditablePlayer = {
    id: string;
    name: string;
    countryCode: string;
    position: PositionCode;
};

type PlayersAdminFormProps = {
    players: Player[];
    countries: Country[];
};

const POSITION_OPTIONS: { value: PositionCode; label: string }[] = [
    { value: "GK", label: "Gardien" },
    { value: "DEF", label: "Defenseur" },
    { value: "MID", label: "Milieu" },
    { value: "FWD", label: "Attaquant" },
];

function normalizeText(value: string) {
    return value
        .trim()
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizePositionCode(value: string): PositionCode {
    const position = normalizeText(value);

    if (
        ["g", "gb", "gk", "goalkeeper", "keeper", "gardien"].includes(position) ||
        position.includes("gardien")
    ) {
        return "GK";
    }

    if (
        ["d", "df", "def", "defenseur", "defender", "defence", "defense"].includes(position) ||
        position.includes("defenseur") ||
        position.includes("defender")
    ) {
        return "DEF";
    }

    if (
        ["m", "mf", "mid", "milieu", "midfield", "midfielder"].includes(position) ||
        position.includes("milieu") ||
        position.includes("midfield")
    ) {
        return "MID";
    }

    if (
        ["a", "fw", "fwd", "att", "attaquant", "attack", "attacker", "forward"].includes(position) ||
        position.includes("attaquant") ||
        position.includes("forward")
    ) {
        return "FWD";
    }

    return "GK";
}

function buildEditablePlayers(players: Player[]): EditablePlayer[] {
    return players.map((player) => ({
        id: player.id,
        name: player.name,
        countryCode: player.country_code,
        position: normalizePositionCode(player.position),
    }));
}

function buildCountryMap(countries: Country[]) {
    return new Map(countries.map((country) => [country.code, country.name]));
}

export default function PlayersAdminForm({ players, countries }: PlayersAdminFormProps) {
    const router = useRouter();
    const [items, setItems] = useState<EditablePlayer[]>(() => buildEditablePlayers(players));
    const [nameFilter, setNameFilter] = useState("");
    const [countryFilter, setCountryFilter] = useState("ALL");
    const [positionFilter, setPositionFilter] = useState<PositionCode | "ALL">("ALL");
    const [newName, setNewName] = useState("");
    const [newCountryCode, setNewCountryCode] = useState(() => countries[0]?.code ?? "");
    const [newPosition, setNewPosition] = useState<PositionCode>("GK");
    const [result, setResult] = useState<PlayerMutationResult | null>(null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const countriesByCode = useMemo(() => buildCountryMap(countries), [countries]);

    const baselineById = useMemo(
        () => new Map(buildEditablePlayers(players).map((item) => [item.id, item])),
        [players],
    );

    const sortedItems = useMemo(() => {
        return items
            .slice()
            .sort((a, b) => {
                const countryA = countriesByCode.get(a.countryCode) ?? a.countryCode;
                const countryB = countriesByCode.get(b.countryCode) ?? b.countryCode;
                const byCountry = countryA.localeCompare(countryB, "fr-FR");

                if (byCountry !== 0) {
                    return byCountry;
                }

                const byPosition = a.position.localeCompare(b.position, "fr-FR");

                if (byPosition !== 0) {
                    return byPosition;
                }

                return a.name.localeCompare(b.name, "fr-FR");
            });
    }, [countriesByCode, items]);

    const filteredItems = useMemo(() => {
        const normalizedNameFilter = normalizeText(nameFilter);

        return sortedItems.filter((item) => {
            const countryName = countriesByCode.get(item.countryCode) ?? item.countryCode;
            const nameOk =
                normalizedNameFilter.length === 0 ||
                normalizeText(item.name).includes(normalizedNameFilter) ||
                normalizeText(countryName).includes(normalizedNameFilter);
            const countryOk = countryFilter === "ALL" || item.countryCode === countryFilter;
            const positionOk = positionFilter === "ALL" || item.position === positionFilter;
            return nameOk && countryOk && positionOk;
        });
    }, [countriesByCode, countryFilter, nameFilter, positionFilter, sortedItems]);

    const changedItems = useMemo(() => {
        return items.filter((item) => {
            const baseline = baselineById.get(item.id);

            if (!baseline) {
                return true;
            }

            return (
                item.name.trim() !== baseline.name.trim() ||
                item.countryCode !== baseline.countryCode ||
                item.position !== baseline.position
            );
        });
    }, [baselineById, items]);

    function updateLocalItem(playerId: string, patch: Partial<EditablePlayer>) {
        setResult(null);
        setItems((current) =>
            current.map((item) => (item.id === playerId ? { ...item, ...patch } : item)),
        );
    }

    function onCreatePlayer() {
        setResult(null);

        startTransition(async () => {
            setPendingAction("create");
            const mutationResult = await createPlayer({
                name: newName,
                countryCode: newCountryCode,
                position: newPosition,
            });

            setResult(mutationResult);
            setPendingAction(null);

            if (mutationResult.ok) {
                setNewName("");
                setNewPosition("GK");
                router.refresh();
            }
        });
    }

    function onSaveAllPlayers() {
        setResult(null);

        if (!changedItems.length) {
            setResult({ ok: false, message: "Aucune modification a sauvegarder." });
            return;
        }

        startTransition(async () => {
            setPendingAction("save-all");
            const mutationResult = await savePlayersBatch(
                changedItems.map((item) => ({
                    id: item.id,
                    name: item.name,
                    countryCode: item.countryCode,
                    position: item.position,
                })),
            );

            setResult(mutationResult);
            setPendingAction(null);

            if (mutationResult.ok) {
                router.refresh();
            }
        });
    }

    function onDeletePlayer(item: EditablePlayer) {
        const confirmed = window.confirm(
            `Supprimer ${item.name} ? Cette action est definitive.`,
        );

        if (!confirmed) {
            return;
        }

        setResult(null);

        startTransition(async () => {
            setPendingAction(`delete-${item.id}`);
            const mutationResult = await deletePlayer(item.id);
            setResult(mutationResult);
            setPendingAction(null);

            if (mutationResult.ok) {
                setItems((current) => current.filter((player) => player.id !== item.id));
                router.refresh();
            }
        });
    }

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-xl shadow-black/20">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">Administration</p>
                    <h1 className="mt-2 text-3xl font-black sm:text-4xl">Gestion des joueurs</h1>
                    <p className="mt-3 text-sm text-emerald-50/85">
                        Ajoute, modifie ou supprime les joueurs de la base en gardant la liste utilisable sur mobile.
                    </p>
                </section>

                <section className="rounded-lg border border-white/15 bg-emerald-950/50 p-4">
                    <h2 className="text-lg font-black">Ajouter un joueur</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                        <label className="text-sm font-semibold">
                            Nom
                            <input
                                type="text"
                                value={newName}
                                onChange={(event) => setNewName(event.target.value)}
                                className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                placeholder="Ex: Kylian Mbappe"
                            />
                        </label>

                        <label className="text-sm font-semibold">
                            Pays
                            <select
                                value={newCountryCode}
                                onChange={(event) => setNewCountryCode(event.target.value)}
                                className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                            >
                                {countries.map((country) => (
                                    <option key={country.code} value={country.code}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-sm font-semibold">
                            Poste
                            <select
                                value={newPosition}
                                onChange={(event) => setNewPosition(event.target.value as PositionCode)}
                                className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                            >
                                {POSITION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <button
                            type="button"
                            onClick={onCreatePlayer}
                            disabled={isPending || pendingAction === "create"}
                            className="h-fit rounded-md bg-yellow-300 px-4 py-2 text-sm font-black text-green-950 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                        >
                            {pendingAction === "create" ? "Ajout..." : "Ajouter"}
                        </button>
                    </div>
                </section>

                <section className="rounded-lg border border-white/15 bg-emerald-950/50 p-4">
                    <h2 className="text-lg font-black">Filtres</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                        <label className="text-sm font-semibold">
                            Recherche (joueur/pays)
                            <input
                                type="text"
                                value={nameFilter}
                                onChange={(event) => setNameFilter(event.target.value)}
                                className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                placeholder="Ex: mbappe, france"
                            />
                        </label>

                        <label className="text-sm font-semibold">
                            Pays
                            <select
                                value={countryFilter}
                                onChange={(event) => setCountryFilter(event.target.value)}
                                className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                            >
                                <option value="ALL">Tous les pays</option>
                                {countries.map((country) => (
                                    <option key={`filter-${country.code}`} value={country.code}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-sm font-semibold">
                            Poste
                            <select
                                value={positionFilter}
                                onChange={(event) =>
                                    setPositionFilter(event.target.value as PositionCode | "ALL")
                                }
                                className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                            >
                                <option value="ALL">Tous les postes</option>
                                {POSITION_OPTIONS.map((option) => (
                                    <option key={`filter-position-${option.value}`} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <button
                            type="button"
                            onClick={() => {
                                setNameFilter("");
                                setCountryFilter("ALL");
                                setPositionFilter("ALL");
                            }}
                            className="h-fit rounded-md bg-white/15 px-4 py-2 text-sm font-black text-white transition hover:bg-white/25"
                        >
                            Reinitialiser
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-emerald-100/80">
                        {filteredItems.length} resultat(s) sur {sortedItems.length} joueur(s).
                    </p>
                </section>

                <section className="space-y-3">
                    {filteredItems.map((item) => {
                        const countryName = countriesByCode.get(item.countryCode) ?? item.countryCode;

                        return (
                            <article
                                key={item.id}
                                className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-lg shadow-black/20"
                            >
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                                    <label className="text-sm font-semibold">
                                        Nom
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(event) =>
                                                updateLocalItem(item.id, { name: event.target.value })
                                            }
                                            className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                        />
                                    </label>

                                    <label className="text-sm font-semibold">
                                        Pays
                                        <select
                                            value={item.countryCode}
                                            onChange={(event) =>
                                                updateLocalItem(item.id, {
                                                    countryCode: event.target.value,
                                                })
                                            }
                                            className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                        >
                                            {countries.map((country) => (
                                                <option key={`${item.id}-${country.code}`} value={country.code}>
                                                    {country.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="text-sm font-semibold">
                                        Poste
                                        <select
                                            value={item.position}
                                            onChange={(event) =>
                                                updateLocalItem(item.id, {
                                                    position: event.target.value as PositionCode,
                                                })
                                            }
                                            className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-slate-900"
                                        >
                                            {POSITION_OPTIONS.map((option) => (
                                                <option key={`${item.id}-${option.value}`} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => onDeletePlayer(item)}
                                        disabled={isPending}
                                        className="h-fit rounded-md bg-red-500/80 px-4 py-2 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-200"
                                    >
                                        {pendingAction === `delete-${item.id}` ? "Suppression..." : "Supprimer"}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-emerald-100/75">{countryName}</p>
                            </article>
                        );
                    })}
                </section>

                <section className="flex flex-col gap-3 rounded-lg border border-white/15 bg-emerald-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-emerald-50/90">
                        Modifications en attente: <span className="text-yellow-200">{changedItems.length}</span>
                    </p>
                    <button
                        type="button"
                        onClick={onSaveAllPlayers}
                        disabled={isPending || changedItems.length === 0}
                        className="rounded-md bg-yellow-300 px-5 py-3 text-sm font-black text-green-950 shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                        {pendingAction === "save-all" ? "Enregistrement..." : "Sauvegarder les modifications"}
                    </button>
                </section>

                <section className="rounded-lg border border-white/15 bg-emerald-950/50 p-4 text-sm font-semibold text-emerald-50/90">
                    {result
                        ? result.message
                        : `${filteredItems.length} joueur(s) affiche(s) sur ${sortedItems.length}.`}
                </section>
            </div>
        </div>
    );
}

