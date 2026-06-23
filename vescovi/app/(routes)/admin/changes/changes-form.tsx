"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { makeTeamChange, type MakeTeamChangeResult, type TeamChangePayload } from "./actions";
import { normalizePosition } from "@/lib/teamChanges";

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

type InitialTeamChange = {
    playerOutId: string;
    playerInId: string;
};

type ChangeDraft = {
    playerOutId: string;
    playerInId: string;
    countryCode: string;
};

type ChangesFormProps = {
    userTeam: TeamWithPlayers;
    players: Player[];
    countries: Country[];
    initialChanges: InitialTeamChange[];
    hasAnySavedRequest: boolean;
    loadError: string | null;
};

const CHANGE_SLOT_COUNT = 2;

function buildInitialDrafts(initialChanges: InitialTeamChange[], playersById: Map<string, Player>) {
    const drafts: ChangeDraft[] = Array.from({ length: CHANGE_SLOT_COUNT }, (_, index) => {
        const initialChange = initialChanges[index];
        const incomingPlayer = initialChange ? playersById.get(initialChange.playerInId) : null;

        return {
            playerOutId: initialChange?.playerOutId ?? "",
            playerInId: initialChange?.playerInId ?? "",
            countryCode: incomingPlayer?.country_code ?? "",
        };
    });

    return drafts;
}

export default function ChangesForm({
    userTeam,
    players,
    countries,
    initialChanges,
    hasAnySavedRequest,
    loadError,
}: ChangesFormProps) {
    const playersById = useMemo(
        () => new Map(players.map((player) => [player.id, player])),
        [players],
    );
    const countryNamesByCode = useMemo(
        () => new Map(countries.map((country) => [country.code, country.name])),
        [countries],
    );
    const [drafts, setDrafts] = useState<ChangeDraft[]>(() =>
        buildInitialDrafts(initialChanges, playersById),
    );
    const [saveResult, setSaveResult] = useState<MakeTeamChangeResult | null>(null);
    const [isSaving, startSaving] = useTransition();

    const currentTeamPlayers = userTeam.players;

    const completeChanges = drafts.filter(
        (draft) => draft.playerOutId && draft.playerInId,
    );
    const hasSavedChanges = hasAnySavedRequest || completeChanges.length > 0;
    const hasIncompleteChange = drafts.some(
        (draft) =>
            (draft.playerOutId && !draft.playerInId) ||
            (!draft.playerOutId && Boolean(draft.playerInId)),
    );
    const duplicateOutgoing =
        new Set(drafts.map((draft) => draft.playerOutId).filter(Boolean)).size !==
        drafts.map((draft) => draft.playerOutId).filter(Boolean).length;
    const duplicateIncoming =
        new Set(drafts.map((draft) => draft.playerInId).filter(Boolean)).size !==
        drafts.map((draft) => draft.playerInId).filter(Boolean).length;

    const canSubmit =
        completeChanges.length > 0 &&
        !hasIncompleteChange &&
        !duplicateOutgoing &&
        !duplicateIncoming;

    function updateDraft(index: number, patch: Partial<ChangeDraft>) {
        setSaveResult(null);
        setDrafts((current) =>
            current.map((draft, currentIndex) =>
                currentIndex === index
                    ? {
                          ...draft,
                          ...patch,
                      }
                    : draft,
            ),
        );
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const payload: TeamChangePayload = {
            teamId: userTeam.id,
            changes: completeChanges.map((draft) => ({
                playerOutId: draft.playerOutId,
                playerInId: draft.playerInId,
            })),
        };

        startSaving(async () => {
            const result = await makeTeamChange(payload);
            setSaveResult(result);
        });
    }

    function handleClearChanges() {
        startSaving(async () => {
            const result = await makeTeamChange({
                teamId: userTeam.id,
                changes: [],
            });
            setSaveResult(result);

            if (result.ok) {
                setDrafts(buildInitialDrafts([], playersById));
            }
        });
    }

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#052e16_0%,#0f3d2e_48%,#111827_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Administration
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                        Changements d&apos;équipe
                    </h1>
                    <p className="mt-3 max-w-3xl text-base leading-7 text-emerald-50/80">
                        Prépare jusqu&apos;à deux remplacements d&apos;un coup. Chaque nouvelle sauvegarde
                        annule et remplace entièrement la demande précédente.
                    </p>
                </div>

                {loadError ? (
                    <div className="mb-4 rounded-lg border border-red-300/50 bg-red-500/15 p-4 text-sm font-semibold text-red-100">
                        Erreur de chargement : {loadError}
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20 backdrop-blur">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                            Mon équipe
                        </p>
                        <p className="mt-3 text-2xl font-black text-yellow-300">{userTeam.name}</p>
                        <p className="mt-2 text-sm text-emerald-50/70">
                            {userTeam.players.length} joueurs
                        </p>
                        <p className="mt-4 text-sm text-emerald-50/80">
                            {hasSavedChanges
                                ? "Une demande de changements est déjà enregistrée ci-dessous."
                                : "Aucune demande enregistrée pour le moment."}
                        </p>
                    </div>

                    {currentTeamPlayers.length > 0 ? (
                        <>
                            <div className="grid gap-6 xl:grid-cols-2">
                                {drafts.map((draft, index) => {
                                    const selectedOutgoingIds = drafts
                                        .map((item, itemIndex) =>
                                            itemIndex === index ? null : item.playerOutId,
                                        )
                                        .filter((value): value is string => Boolean(value));
                                    const selectedIncomingIds = drafts
                                        .map((item, itemIndex) =>
                                            itemIndex === index ? null : item.playerInId,
                                        )
                                        .filter((value): value is string => Boolean(value));
                                    const outgoingPlayer = currentTeamPlayers.find(
                                        (player) => player.id === draft.playerOutId,
                                    );
                                    const outgoingPosition = outgoingPlayer
                                        ? normalizePosition(outgoingPlayer.position)
                                        : null;
                                    const eligibleIncomingPlayers = players.filter((player) => {
                                        const normalizedPosition = normalizePosition(player.position);
                                        const isAlreadyInTeam = currentTeamPlayers.some(
                                            (teamPlayer) => teamPlayer.id === player.id,
                                        );
                                        const alreadySelectedElsewhere = selectedIncomingIds.includes(
                                            player.id,
                                        );

                                        return (
                                            Boolean(outgoingPosition) &&
                                            normalizedPosition === outgoingPosition &&
                                            !isAlreadyInTeam &&
                                            !alreadySelectedElsewhere
                                        );
                                    });
                                    const availableCountries = countries.filter((country) =>
                                        eligibleIncomingPlayers.some(
                                            (player) => player.country_code === country.code,
                                        ),
                                    );
                                    const visibleIncomingPlayers = draft.countryCode
                                        ? eligibleIncomingPlayers.filter(
                                              (player) => player.country_code === draft.countryCode,
                                          )
                                        : eligibleIncomingPlayers;

                                    return (
                                        <section
                                            key={`change-slot-${index}`}
                                            className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20 backdrop-blur"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                                                        Changement {index + 1}
                                                    </p>
                                                    <h2 className="mt-2 text-xl font-black text-white">
                                                        Remplacement {index + 1}
                                                    </h2>
                                                </div>
                                                {draft.playerOutId && draft.playerInId ? (
                                                    <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-100">
                                                        Complet
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-50/70">
                                                        Optionnel
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-5 space-y-4">
                                                <label className="block">
                                                    <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                                                        Joueur sortant
                                                    </span>
                                                    <select
                                                        value={draft.playerOutId}
                                                        onChange={(event) => {
                                                            updateDraft(index, {
                                                                playerOutId: event.target.value,
                                                                playerInId: "",
                                                                countryCode: "",
                                                            });
                                                        }}
                                                        className="mt-2 w-full rounded-md border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60"
                                                    >
                                                        <option value="">Aucun joueur</option>
                                                        {currentTeamPlayers
                                                            .filter(
                                                                (player) =>
                                                                    !selectedOutgoingIds.includes(player.id) ||
                                                                    player.id === draft.playerOutId,
                                                            )
                                                            .map((player) => (
                                                                <option key={player.id} value={player.id}>
                                                                    {player.name} - {player.position}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </label>

                                                <label className="block">
                                                    <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                                                        Filtre pays du joueur entrant
                                                    </span>
                                                    <select
                                                        value={draft.countryCode}
                                                        onChange={(event) => {
                                                            const nextCountryCode = event.target.value;
                                                            const currentIncomingPlayer = playersById.get(
                                                                draft.playerInId,
                                                            );
                                                            updateDraft(index, {
                                                                countryCode: nextCountryCode,
                                                                playerInId:
                                                                    currentIncomingPlayer &&
                                                                    currentIncomingPlayer.country_code ===
                                                                        nextCountryCode
                                                                        ? draft.playerInId
                                                                        : nextCountryCode
                                                                          ? ""
                                                                          : draft.playerInId,
                                                            });
                                                        }}
                                                        disabled={!draft.playerOutId}
                                                        className="mt-2 w-full rounded-md border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                                    >
                                                        <option value="">
                                                            {draft.playerOutId
                                                                ? "Tous les pays disponibles"
                                                                : "Choisir d'abord un joueur sortant"}
                                                        </option>
                                                        {availableCountries.map((country) => (
                                                            <option key={country.code} value={country.code}>
                                                                {country.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>

                                                <label className="block">
                                                    <span className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                                                        Joueur entrant
                                                    </span>
                                                    <select
                                                        value={draft.playerInId}
                                                        onChange={(event) => {
                                                            const nextPlayerId = event.target.value;
                                                            const nextPlayer = playersById.get(nextPlayerId);
                                                            updateDraft(index, {
                                                                playerInId: nextPlayerId,
                                                                countryCode:
                                                                    nextPlayer?.country_code ?? draft.countryCode,
                                                            });
                                                        }}
                                                        disabled={!draft.playerOutId}
                                                        className="mt-2 w-full rounded-md border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                                    >
                                                        <option value="">
                                                            {draft.playerOutId
                                                                ? "Sélectionner un joueur"
                                                                : "Choisir d'abord un joueur sortant"}
                                                        </option>
                                                        {visibleIncomingPlayers.map((player) => (
                                                            <option key={player.id} value={player.id}>
                                                                {player.name} - {countryNamesByCode.get(player.country_code) ?? player.country_code}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>

                                            {draft.playerOutId && draft.playerInId ? (
                                                <div className="mt-5 rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-4">
                                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-200">
                                                        Résumé
                                                    </p>
                                                    <div className="mt-3 space-y-2 text-sm font-semibold text-emerald-50">
                                                        <p>
                                                            Sortant : <span className="text-red-300">{outgoingPlayer?.name ?? "Inconnu"}</span>
                                                        </p>
                                                        <p>
                                                            Entrant : <span className="text-green-300">{playersById.get(draft.playerInId)?.name ?? "Inconnu"}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </section>
                                    );
                                })}
                            </div>

                            {(hasIncompleteChange || duplicateOutgoing || duplicateIncoming || saveResult) && (
                                <div
                                    className={`rounded-lg border p-4 text-sm font-semibold ${
                                        saveResult?.ok
                                            ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-100"
                                            : saveResult
                                              ? "border-red-300/50 bg-red-500/15 text-red-100"
                                              : "border-amber-300/50 bg-amber-500/15 text-amber-100"
                                    }`}
                                >
                                    {saveResult?.message ??
                                        (duplicateOutgoing
                                            ? "Un même joueur sortant ne peut être sélectionné qu'une seule fois."
                                            : duplicateIncoming
                                              ? "Un même joueur entrant ne peut être sélectionné qu'une seule fois."
                                              : "Chaque remplacement commencé doit être complété avant la sauvegarde.")}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="submit"
                                    disabled={!canSubmit || isSaving}
                                    className="flex-1 rounded-md bg-yellow-300 px-5 py-3 text-sm font-black text-green-950 shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                                >
                                    {isSaving
                                        ? "Enregistrement..."
                                        : completeChanges.length === 2
                                          ? "Enregistrer mes 2 changements"
                                          : "Enregistrer mon changement"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearChanges}
                                    disabled={!hasSavedChanges || isSaving}
                                    className="rounded-md border border-red-300/40 bg-red-500/15 px-5 py-3 text-sm font-black text-red-100 transition hover:bg-red-500/25 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:border-slate-400/30 disabled:bg-slate-400/20 disabled:text-slate-300"
                                >
                                    Supprimer mes changements
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-lg border border-amber-300/50 bg-amber-500/15 p-4 text-sm font-semibold text-amber-100">
                            Impossible de charger les joueurs de ton équipe.
                        </div>
                    )}
                </form>

                <div className="mt-8 rounded-lg border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Rappel des contraintes
                    </p>
                    <ul className="mt-4 space-y-3">
                        <li className="flex gap-3 text-sm font-semibold text-emerald-50/90">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-[11px] font-black text-green-950">
                                ✓
                            </span>
                            <span>Deux changements maximum, sauvegardés en une seule demande</span>
                        </li>
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
                            <span>L&apos;équipe doit toujours respecter 5 nationalités minimum et 3 joueurs maximum par pays</span>
                        </li>
                        <li className="flex gap-3 text-sm font-semibold text-emerald-50/90">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-[11px] font-black text-green-950">
                                ✓
                            </span>
                            <span>Une nouvelle sauvegarde annule et remplace la précédente</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
