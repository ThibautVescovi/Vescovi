"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { requireAdminRole } from "@/lib/authz";

type PositionCode = "GK" | "DEF" | "MID" | "FWD";

type PlayerPayload = {
    name: string;
    countryCode: string;
    position: string;
};

export type PlayerMutationResult = {
    ok: boolean;
    message: string;
};

function normalizeText(value: string) {
    return value
        .trim()
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizePositionCode(value: string): PositionCode | null {
    const position = normalizeText(value);

    if (["g", "gb", "gk", "goalkeeper", "keeper", "gardien"].includes(position) || position.includes("gardien")) {
        return "GK";
    }

    if (["d", "df", "def", "defenseur", "defender", "defence", "defense"].includes(position) || position.includes("defenseur") || position.includes("defender")) {
        return "DEF";
    }

    if (["m", "mf", "mid", "milieu", "midfield", "midfielder"].includes(position) || position.includes("milieu") || position.includes("midfield")) {
        return "MID";
    }

    if (["a", "fw", "fwd", "att", "attaquant", "attack", "attacker", "forward"].includes(position) || position.includes("attaquant") || position.includes("forward")) {
        return "FWD";
    }

    return null;
}

async function validatePayload(payload: PlayerPayload): Promise<
    | { ok: true; value: { name: string; countryCode: string; position: PositionCode } }
    | { ok: false; result: PlayerMutationResult }
> {
    const name = payload.name.trim();
    const countryCode = payload.countryCode.trim().toUpperCase();
    const position = normalizePositionCode(payload.position);

    if (!name) {
        return { ok: false, result: { ok: false, message: "Le nom du joueur est obligatoire." } };
    }

    if (name.length > 120) {
        return { ok: false, result: { ok: false, message: "Le nom du joueur est trop long." } };
    }

    if (!countryCode) {
        return { ok: false, result: { ok: false, message: "Le pays est obligatoire." } };
    }

    if (!position) {
        return { ok: false, result: { ok: false, message: "Le poste est invalide." } };
    }

    const supabase = await createClient();
    const { data: country, error: countryError } = await supabase
        .from("countries")
        .select("code")
        .eq("code", countryCode)
        .maybeSingle();

    if (countryError) {
        return {
            ok: false,
            result: { ok: false, message: `Impossible de verifier le pays: ${countryError.message}` },
        };
    }

    if (!country) {
        return { ok: false, result: { ok: false, message: "Le code pays est invalide." } };
    }

    return { ok: true, value: { name, countryCode, position } };
}

function revalidatePlayersPaths() {
    revalidatePath("/admin/players");
    revalidatePath("/admin/points");
    revalidatePath("/team");
    revalidatePath("/view-team");
}

export async function createPlayer(payload: PlayerPayload): Promise<PlayerMutationResult> {
    await requireAdminRole();

    const validation = await validatePayload(payload);

    if (!validation.ok) {
        return validation.result;
    }

    const supabase = await createClient();
    const { error } = await supabase.from("players").insert({
        name: validation.value.name,
        country_code: validation.value.countryCode,
        position: validation.value.position,
    });

    if (error) {
        return {
            ok: false,
            message: `Impossible d'ajouter le joueur: ${error.message}`,
        };
    }

    revalidatePlayersPaths();

    return {
        ok: true,
        message: "Joueur ajoute.",
    };
}

export async function updatePlayer(
    playerId: string,
    payload: PlayerPayload,
): Promise<PlayerMutationResult> {
    await requireAdminRole();

    if (!playerId) {
        return { ok: false, message: "Identifiant joueur invalide." };
    }

    const validation = await validatePayload(payload);

    if (!validation.ok) {
        return validation.result;
    }

    const supabase = await createClient();
    const { error } = await supabase
        .from("players")
        .update({
            name: validation.value.name,
            country_code: validation.value.countryCode,
            position: validation.value.position,
        })
        .eq("id", playerId);

    if (error) {
        return {
            ok: false,
            message: `Impossible de modifier le joueur: ${error.message}`,
        };
    }

    revalidatePlayersPaths();

    return {
        ok: true,
        message: "Joueur mis a jour.",
    };
}

export async function deletePlayer(playerId: string): Promise<PlayerMutationResult> {
    await requireAdminRole();

    if (!playerId) {
        return { ok: false, message: "Identifiant joueur invalide." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("players").delete().eq("id", playerId);

    if (error) {
        const isForeignKeyError = error.code === "23503";

        return {
            ok: false,
            message: isForeignKeyError
                ? "Impossible de supprimer ce joueur car il est deja utilise dans des equipes ou des performances."
                : `Impossible de supprimer le joueur: ${error.message}`,
        };
    }

    revalidatePlayersPaths();

    return {
        ok: true,
        message: "Joueur supprime.",
    };
}

