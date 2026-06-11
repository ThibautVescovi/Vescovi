"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { requireAdminRole } from "@/lib/authz";

type Position = "Gardien" | "Défenseur" | "Milieu" | "Attaquant";

export type MakeTeamChangeResult = {
    ok: boolean;
    message: string;
};

export type TeamChangePayload = {
    teamId: string;
    playerOutId: string | null;
    playerInId: string | null;
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

export async function makeTeamChange(payload: TeamChangePayload): Promise<MakeTeamChangeResult> {
    await requireAdminRole();

    const supabase = await createClient();
    const { teamId, playerOutId, playerInId } = payload;

    // Validation basique
    if (!teamId) {
        return {
            ok: false,
            message: "L'équipe doit être spécifiée.",
        };
    }

    // Au moins un joueur doit être changé
    if (!playerOutId && !playerInId) {
        return {
            ok: false,
            message: "Tu dois sélectionner au moins un changement.",
        };
    }

    // Récupérer l'équipe et ses joueurs actuels
    const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, user_id")
        .eq("id", teamId)
        .single();

    if (teamError || !team) {
        return {
            ok: false,
            message: "Équipe non trouvée.",
        };
    }

    // Récupérer les joueurs actuels de l'équipe
    const { data: teamPlayers, error: teamPlayersError } = await supabase
        .from("team_players")
        .select("player_id, position")
        .eq("team_id", teamId)
        .eq("is_active", true);

    if (teamPlayersError || !teamPlayers) {
        return {
            ok: false,
            message: "Impossible de récupérer les joueurs de l'équipe.",
        };
    }

    // Récupérer les informations des joueurs
    const playerIds = teamPlayers.map((tp) => tp.player_id);
    const { data: currentPlayers, error: currentPlayersError } = await supabase
        .from("players")
        .select("id, country_code, position")
        .in("id", playerIds);

    if (currentPlayersError || !currentPlayers) {
        return {
            ok: false,
            message: "Impossible de récupérer les informations des joueurs.",
        };
    }

    // Vérifier les changements proposés
    let playerOut: any = null;
    let playerIn: any = null;

    if (playerOutId) {
        playerOut = currentPlayers.find((p) => p.id === playerOutId);
        if (!playerOut) {
            return {
                ok: false,
                message: "Le joueur à remplacer n'est pas dans l'équipe.",
            };
        }
    }

    if (playerInId) {
        const { data: playerInData, error: playerInError } = await supabase
            .from("players")
            .select("id, country_code, position")
            .eq("id", playerInId)
            .single();

        if (playerInError || !playerInData) {
            return {
                ok: false,
                message: "Le joueur entrant n'existe pas.",
            };
        }

        playerIn = playerInData;

        // Vérifier que le joueur entrant n'est pas déjà dans l'équipe
        if (currentPlayers.some((p) => p.id === playerInId)) {
            return {
                ok: false,
                message: "Ce joueur est déjà dans l'équipe.",
            };
        }

        // Si on replace un joueur, vérifier les positions
        if (playerOut) {
            const outPosition = normalizePosition(playerOut.position);
            const inPosition = normalizePosition(playerIn.position);

            if (outPosition !== inPosition) {
                return {
                    ok: false,
                    message: "Le joueur entrant doit avoir le même poste que le joueur sortant.",
                };
            }
        }
    }

    // Valider les règles de naturalité
    const newTeamComposition = currentPlayers.filter((p) => p.id !== playerOutId);
    if (playerIn) {
        newTeamComposition.push(playerIn);
    }

    // Compter les nationalités
    const nationalityCounts: Record<string, number> = {};
    for (const player of newTeamComposition) {
        if (player.country_code) {
            nationalityCounts[player.country_code] =
                (nationalityCounts[player.country_code] ?? 0) + 1;
        }
    }

    const uniqueNationalities = Object.keys(nationalityCounts).length;
    const overLimitCountries = Object.entries(nationalityCounts)
        .filter(([, count]) => count > 3)
        .map(([code]) => code);

    if (uniqueNationalities < 5) {
        return {
            ok: false,
            message: "L'équipe doit avoir au minimum 5 nationalités différentes.",
        };
    }

    if (overLimitCountries.length > 0) {
        return {
            ok: false,
            message: `L'équipe ne peut pas avoir plus de 3 joueurs d'une même nationalité: ${overLimitCountries.join(", ")}`,
        };
    }

    // Valider la composition par poste
    const positionCounts: Record<Position, number> = {
        Gardien: 0,
        Défenseur: 0,
        Milieu: 0,
        Attaquant: 0,
    };

    for (const player of newTeamComposition) {
        const position = normalizePosition(player.position);
        if (position) {
            positionCounts[position] += 1;
        }
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

    // Enregistrer le changement dans team_changes
    const { error: changeError } = await supabase.from("team_changes").insert({
        team_id: teamId,
        player_out_id: playerOutId || null,
        player_in_id: playerInId || null,
        created_at: new Date().toISOString(),
    });

    if (changeError) {
        return {
            ok: false,
            message: `Impossible d'enregistrer le changement: ${changeError.message}`,
        };
    }

    revalidatePath("/admin/changes");

    return {
        ok: true,
        message: "Changement enregistré avec succès.",
    };
}


