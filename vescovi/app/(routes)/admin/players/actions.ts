"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
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

type PlayerBatchUpdateInput = {
    id: string;
    name: string;
    countryCode: string;
    position: string;
};

function createServiceRoleClient(): SupabaseClient | null {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Supporte le nouveau format sb_secret_... (SUPABASE_SECRET_KEY)
    // et l'ancien format service_role (SUPABASE_SERVICE_ROLE_KEY)
    const serviceRoleKey =
        process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return null;
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

type AnySupabaseClient = SupabaseClient | Awaited<ReturnType<typeof createClient>>;

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

async function removePlayersFromTeamsAndInvalidateEntries(
    playerIds: string[],
    fallbackClient: AnySupabaseClient,
): Promise<PlayerMutationResult | null> {
    // Utilise le client service role (bypass RLS) si disponible,
    // sinon utilise le client admin authentifié en fallback.
    const supabase: AnySupabaseClient = createServiceRoleClient() ?? fallbackClient;

    const uniquePlayerIds = Array.from(new Set(playerIds.map((id) => id.trim()).filter(Boolean)));

    if (!uniquePlayerIds.length) {
        return null;
    }

    const { data: teamPlayers, error: teamPlayersError } = await supabase
        .from("team_players")
        .select("team_id")
        .in("player_id", uniquePlayerIds);

    if (teamPlayersError) {
        return {
            ok: false,
            message: `Impossible d'identifier les equipes a invalider: ${teamPlayersError.message}`,
        };
    }

    const teamIds = Array.from(new Set((teamPlayers ?? []).map((row) => row.team_id).filter(Boolean)));

    const { error: deleteTeamPlayersError } = await supabase
        .from("team_players")
        .delete()
        .in("player_id", uniquePlayerIds);

    if (deleteTeamPlayersError) {
        return {
            ok: false,
            message: `Impossible de retirer le joueur des equipes: ${deleteTeamPlayersError.message}`,
        };
    }

    if (!teamIds.length) {
        return null;
    }

    const { error: invalidateEntriesError } = await supabase
        .from("entries")
        .update({ is_approved: false })
        .in("team_id", teamIds);

    if (invalidateEntriesError) {
        return {
            ok: false,
            message: `Le joueur a ete retire des equipes, mais impossible d'invalider les inscriptions: ${invalidateEntriesError.message}`,
        };
    }

    return null;
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
    const { data: existingPlayer, error: existingPlayerError } = await supabase
        .from("players")
        .select("id,position")
        .eq("id", playerId)
        .maybeSingle();

    if (existingPlayerError) {
        return {
            ok: false,
            message: `Impossible de verifier le joueur: ${existingPlayerError.message}`,
        };
    }

    if (!existingPlayer) {
        return {
            ok: false,
            message: "Le joueur n'existe plus.",
        };
    }

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

    const previousPosition = normalizePositionCode(existingPlayer.position);
    const positionChanged = previousPosition !== validation.value.position;

    if (positionChanged) {
        const cleanupError = await removePlayersFromTeamsAndInvalidateEntries([playerId], supabase);

        if (cleanupError) {
            return cleanupError;
        }
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
    const cleanupError = await removePlayersFromTeamsAndInvalidateEntries([playerId], supabase);

    if (cleanupError) {
        return cleanupError;
    }

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

export async function savePlayersBatch(
    rows: PlayerBatchUpdateInput[],
): Promise<PlayerMutationResult> {
    await requireAdminRole();

    if (!rows.length) {
        return {
            ok: false,
            message: "Aucune modification a enregistrer.",
        };
    }

    const invalidId = rows.find((row) => !row.id?.trim());

    if (invalidId) {
        return {
            ok: false,
            message: "Au moins un identifiant joueur est invalide.",
        };
    }

    const normalizedRows = rows.map((row) => {
        const name = row.name.trim();
        const countryCode = row.countryCode.trim().toUpperCase();
        const position = normalizePositionCode(row.position);

        return {
            id: row.id,
            name,
            countryCode,
            position,
        };
    });

    const invalidName = normalizedRows.find((row) => !row.name || row.name.length > 120);

    if (invalidName) {
        return {
            ok: false,
            message: "Au moins un nom joueur est vide ou trop long.",
        };
    }

    const invalidPosition = normalizedRows.find((row) => !row.position);

    if (invalidPosition) {
        return {
            ok: false,
            message: "Au moins un poste est invalide.",
        };
    }

    const uniqueCountryCodes = Array.from(
        new Set(normalizedRows.map((row) => row.countryCode).filter(Boolean)),
    );

    const supabase = await createClient();
    const { data: countries, error: countriesError } = await supabase
        .from("countries")
        .select("code")
        .in("code", uniqueCountryCodes);

    if (countriesError) {
        return {
            ok: false,
            message: `Impossible de verifier les pays: ${countriesError.message}`,
        };
    }

    const existingCodes = new Set((countries ?? []).map((country) => country.code));
    const missingCountry = uniqueCountryCodes.find((code) => !existingCodes.has(code));

    if (missingCountry) {
        return {
            ok: false,
            message: `Code pays invalide: ${missingCountry}`,
        };
    }

    const ids = normalizedRows.map((row) => row.id);
    const { data: existingPlayers, error: existingPlayersError } = await supabase
        .from("players")
        .select("id,position")
        .in("id", ids);

    if (existingPlayersError) {
        return {
            ok: false,
            message: `Impossible de verifier les joueurs: ${existingPlayersError.message}`,
        };
    }

    const existingIds = new Set((existingPlayers ?? []).map((player) => player.id));
    const missingId = ids.find((id) => !existingIds.has(id));

    if (missingId) {
        return {
            ok: false,
            message: "Au moins un joueur n'existe plus. Recharge la page avant de sauvegarder.",
        };
    }

    const existingPlayersById = new Map((existingPlayers ?? []).map((player) => [player.id, player]));
    const playersWithPositionChange = normalizedRows
        .filter((row) => {
            const existingPlayer = existingPlayersById.get(row.id);

            if (!existingPlayer) {
                return false;
            }

            return normalizePositionCode(existingPlayer.position) !== row.position;
        })
        .map((row) => row.id);

    const updateResults = await Promise.all(
        normalizedRows.map((row) =>
            supabase
                .from("players")
                .update({
                    name: row.name,
                    country_code: row.countryCode,
                    position: row.position,
                })
                .eq("id", row.id)
                .select("id")
                .maybeSingle(),
        ),
    );

    const updateError = updateResults.find((result) => result.error)?.error;

    if (updateError) {
        const isRlsError = updateError.code === "42501";

        return {
            ok: false,
            message: isRlsError
                ? "Impossible d'enregistrer les joueurs: la policy RLS UPDATE sur players bloque cette action."
                : `Impossible d'enregistrer les joueurs: ${updateError.message}`,
        };
    }

    const blockedUpdate = updateResults.find((result) => !result.data);

    if (blockedUpdate) {
        return {
            ok: false,
            message:
                "Impossible d'enregistrer les joueurs: aucune ligne mise a jour (policy RLS UPDATE probable sur players).",
        };
    }

    if (playersWithPositionChange.length) {
        const cleanupError = await removePlayersFromTeamsAndInvalidateEntries(playersWithPositionChange, supabase);

        if (cleanupError) {
            return cleanupError;
        }
    }

    revalidatePlayersPaths();

    return {
        ok: true,
        message: `${normalizedRows.length} joueur(s) mis a jour.`,
    };
}
