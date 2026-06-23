export type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";

export type TeamPlayerLike = {
    id: string;
    position: string;
    country_code: string;
    name?: string;
};

export type TeamChangeRecord = {
    player_out_id: string | null;
    player_in_id: string | null;
};

export const PRE_CHANGE_STAGE_NAMES = new Set(["match 1", "match 2", "match 3"]);

export function normalizeText(value: string) {
    return value
        .trim()
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

export function normalizePosition(value: string): Position | null {
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
        ["a", "fw", "fwd", "att", "attaquant", "attack", "attacker", "forward"].includes(position) ||
        position.includes("attaquant") ||
        position.includes("forward")
    ) {
        return "Attaquant";
    }

    return null;
}

export function validateTeamComposition(players: TeamPlayerLike[]): { ok: true } | { ok: false; message: string } {
    const nationalityCounts: Record<string, number> = {};
    const positionCounts: Record<Position, number> = {
        Gardien: 0,
        Défenseur: 0,
        Milieu: 0,
        Attaquant: 0,
    };

    for (const player of players) {
        if (player.country_code) {
            nationalityCounts[player.country_code] = (nationalityCounts[player.country_code] ?? 0) + 1;
        }

        const position = normalizePosition(player.position);
        if (!position) {
            return {
                ok: false,
                message: `Poste invalide pour le joueur ${player.name ?? player.id}.`,
            };
        }

        positionCounts[position] += 1;
    }

    if (Object.keys(nationalityCounts).length < 5) {
        return {
            ok: false,
            message: "L'équipe doit avoir au minimum 5 nationalités différentes.",
        };
    }

    const overLimitCountries = Object.entries(nationalityCounts)
        .filter(([, count]) => count > 3)
        .map(([code]) => code);

    if (overLimitCountries.length > 0) {
        return {
            ok: false,
            message: `L'équipe ne peut pas avoir plus de 3 joueurs d'une même nationalité: ${overLimitCountries.join(", ")}`,
        };
    }

    if (
        positionCounts.Gardien !== 1 ||
        positionCounts.Défenseur !== 4 ||
        positionCounts.Milieu !== 3 ||
        positionCounts.Attaquant !== 3
    ) {
        return {
            ok: false,
            message: "La composition doit rester 1 gardien, 4 défenseurs, 3 milieux et 3 attaquants.",
        };
    }

    return { ok: true };
}

export function applyTeamChanges<T extends TeamPlayerLike>(
    basePlayers: T[],
    changes: TeamChangeRecord[],
    playersById: Map<string, T>,
) {
    const outgoingIds = new Set<string>();
    const incomingIds = new Set<string>();
    const effectivePlayers = [...basePlayers];

    for (const change of changes) {
        if (!change.player_out_id || !change.player_in_id) {
            continue;
        }

        const incomingPlayer = playersById.get(change.player_in_id);
        if (!incomingPlayer) {
            continue;
        }

        const outgoingIndex = effectivePlayers.findIndex((player) => player.id === change.player_out_id);
        if (outgoingIndex === -1) {
            continue;
        }

        outgoingIds.add(change.player_out_id);
        incomingIds.add(change.player_in_id);

        effectivePlayers.splice(outgoingIndex, 1, incomingPlayer);
    }

    const historicalPlayers = [...basePlayers];
    for (const incomingId of incomingIds) {
        const incomingPlayer = playersById.get(incomingId);

        if (!incomingPlayer || historicalPlayers.some((player) => player.id === incomingId)) {
            continue;
        }

        historicalPlayers.push(incomingPlayer);
    }

    return {
        effectivePlayers,
        outgoingIds,
        incomingIds,
        historicalPlayers,
    };
}

export function isPreChangeStage(stageName: string | null | undefined) {
    if (!stageName) {
        return false;
    }

    return PRE_CHANGE_STAGE_NAMES.has(normalizeText(stageName));
}


