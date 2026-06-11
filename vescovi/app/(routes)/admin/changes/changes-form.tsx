"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { makeTeamChange, type MakeTeamChangeResult, type TeamChangePayload } from "./actions";

type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";

type Player = {
    id: string;
    name: string;
    country_code: string;
    position: string;
};

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

type ChangesFormProps = {
    userTeam: TeamWithPlayers;
    players: Player[];
    loadError: string | null;
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

export default function ChangesForm({
    userTeam,
    players,
    loadError,
}: ChangesFormProps) {
    const [playerOutId, setPlayerOutId] = useState("");
    const [playerInId, setPlayerInId] = useState("");
    const [saveResult, setSaveResult] = useState<MakeTeamChangeResult | null>(null);
    const [isSaving, startSaving] = useTransition();

    const playersById = useMemo(
        () => new Map(players.map((player) => [player.id, player])),
        [players],
    );

    const currentTeamPlayers = userTeam.players;

    // Récupérer les joueurs disponibles pour le remplacement
    const availablePlayersIn = useMemo(() => {
        if (!playerOutId) return players;

        const outPlayer = currentTeamPlayers.find((p) => p.id === playerOutId);
        if (!outPlayer) return players;

        return players.filter((p) => {
            const pos = normalizePosition(p.position);
            const outPos = normalizePosition(outPlayer.position);
            const isAlreadyInTeam = currentTeamPlayers.some((tp) => tp.id === p.id);
            return pos === outPos && !isAlreadyInTeam;
        });
    }, [playerOutId, currentTeamPlayers, players]);

    const canChange = Boolean(playerOutId || playerInId);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canChange) {
            return;
        }

        const payload: TeamChangePayload = {
            teamId: userTeam.id,
            playerOutId: playerOutId || null,
            playerInId: playerInId || null,
        };

        startSaving(async () => {
            const result = await makeTeamChange(payload);
            setSaveResult(result);

            if (result.ok) {
                setPlayerOutId("");
                setPlayerInId("");
                setTimeout(() => setSaveResult(null), 3000);
            }
        });
    }

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
                <div className="mb-8">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Administration
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Changements d&apos;équipe
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-emerald-50/80">
                        Modifie les joueurs de l&apos;équipe pour les changements après la phase de
                        poule. Les changements sont limités à 2 par équipe et les règles du jeu doivent
                        toujours être respectées.
                    </p>
                </div>

                {loadError ? (
                    <div className="mb-4 rounded-lg border border-red-300/50 bg-red-500/15 p-4 text-sm font-semibold text-red-100">
                        Erreur de chargement : {loadError}
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Affichage de l'équipe sélectionnée */}
                    <div className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20 backdrop-blur">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                            Mon équipe
                        </p>
                        <p className="mt-3 text-2xl font-black text-yellow-300">{userTeam.name}</p>
                        <p className="mt-2 text-sm text-emerald-50/70">
                            {userTeam.players.length} joueurs
                        </p>
                    </div>

                    {currentTeamPlayers.length > 0 ? (
                        <>
                            {/* Joueur sortant */}
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20 backdrop-blur">
                                    <label className="block">
                                        <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                                            Joueur à remplacer (optionnel)
                                        </span>
                                        <select
                                            value={playerOutId}
                                            onChange={(event) => {
                                                setPlayerOutId(event.target.value);
                                                setPlayerInId("");
                                                setSaveResult(null);
                                            }}
                                            className="mt-3 w-full rounded-md border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60"
                                        >
                                            <option value="">Aucun joueur</option>
                                            {currentTeamPlayers.map((player) => (
                                                <option key={player.id} value={player.id}>
                                                    {player.name} - {player.position}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                {/* Joueur entrant */}
                                <div className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20 backdrop-blur">
                                    <label className="block">
                                        <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                                            Joueur à ajouter (optionnel)
                                        </span>
                                        <select
                                            value={playerInId}
                                            onChange={(event) => {
                                                setPlayerInId(event.target.value);
                                                setSaveResult(null);
                                            }}
                                            disabled={!playerOutId}
                                            className="mt-3 w-full rounded-md border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                        >
                                            <option value="">
                                                {playerOutId
                                                    ? "Sélectionner un joueur"
                                                    : "Choisir d'abord un joueur sortant"}
                                            </option>
                                            {availablePlayersIn.map((player) => (
                                                <option key={player.id} value={player.id}>
                                                    {player.name} - {normalizePosition(player.position)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>

                            {/* Résumé du changement */}
                            {playerOutId && playerInId ? (
                                <div className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-6">
                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-200">
                                        Résumé du changement
                                    </p>
                                    <div className="mt-4 space-y-2">
                                        <p className="text-base font-semibold text-emerald-50">
                                            Sortant :{" "}
                                            <span className="text-red-300">
                                                {currentTeamPlayers.find((p) => p.id === playerOutId)
                                                    ?.name || "Inconnu"}
                                            </span>
                                        </p>
                                        <p className="text-base font-semibold text-emerald-50">
                                            Entrant :{" "}
                                            <span className="text-green-300">
                                                {playersById.get(playerInId)?.name || "Inconnu"}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            {/* Message d'erreur/succès */}
                            {saveResult ? (
                                <div
                                    className={`rounded-lg border p-4 text-sm font-semibold ${
                                        saveResult.ok
                                            ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-100"
                                            : "border-red-300/50 bg-red-500/15 text-red-100"
                                    }`}
                                >
                                    {saveResult.message}
                                </div>
                            ) : null}

                            {/* Bouton de soumission */}
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={!canChange || isSaving}
                                    className="flex-1 rounded-md bg-yellow-300 px-5 py-3 text-sm font-black text-green-950 shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                                >
                                    {isSaving ? "Enregistrement..." : "Enregistrer le changement"}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-lg border border-amber-300/50 bg-amber-500/15 p-4 text-sm font-semibold text-amber-100">
                            Impossible de charger les joueurs de ton équipe.
                        </div>
                    )}
                </form>

                {/* Informations sur les règles */}
                <div className="mt-8 rounded-lg border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Rappel des contraintes
                    </p>
                    <ul className="mt-4 space-y-3">
                        <li className="flex gap-3 text-sm font-semibold text-emerald-50/90">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-[11px] font-black text-green-950">
                                ✓
                            </span>
                            <span>Le joueur entrant doit avoir le même poste que le joueur sortant</span>
                        </li>
                        <li className="flex gap-3 text-sm font-semibold text-emerald-50/90">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-[11px] font-black text-green-950">
                                ✓
                            </span>
                            <span>L&apos;équipe doit respecter les 5 nationalités minimum</span>
                        </li>
                        <li className="flex gap-3 text-sm font-semibold text-emerald-50/90">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-[11px] font-black text-green-950">
                                ✓
                            </span>
                            <span>Maximum 3 joueurs d&apos;une même nationalité</span>
                        </li>
                        <li className="flex gap-3 text-sm font-semibold text-emerald-50/90">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-[11px] font-black text-green-950">
                                ✓
                            </span>
                            <span>Le joueur entrant ne doit pas être déjà dans l&apos;équipe</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
