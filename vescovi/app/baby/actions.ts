"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";

export type SaveBabyPayload = {
  first_name?: string | null;
  last_name?: string | null;
  predicted_name?: string | null;
  predicted_date?: string | null; // ISO date string
  weight?: number | null; // kg
  height?: number | null; // cm
};

export type SaveBabyResult = {
  ok: boolean;
  message: string;
};

export async function saveBaby(payload: SaveBabyPayload): Promise<SaveBabyResult> {
  const supabase = await createClient();

  const first_name = typeof payload.first_name === "string" ? payload.first_name.trim() : null;
  const last_name = typeof payload.last_name === "string" ? payload.last_name.trim() : null;
  const predicted_name = typeof payload.predicted_name === "string" ? payload.predicted_name.trim() : null;
  const predicted_date = typeof payload.predicted_date === "string" && payload.predicted_date ? payload.predicted_date : null;
  const weight = typeof payload.weight === "number" && !Number.isNaN(payload.weight) ? payload.weight : null;
  const height = typeof payload.height === "number" && !Number.isNaN(payload.height) ? payload.height : null;

  if (!first_name && !last_name && !predicted_name) {
    return { ok: false, message: "Veuillez renseigner au moins un prénom, nom ou prénom prévu." };
  }

  // Use service role client if available to bypass RLS for public page inserts.
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const createSupabaseClient = (await import("@supabase/supabase-js")).createClient as typeof import("@supabase/supabase-js").createClient;

  const adminClient =
    serviceRoleKey && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : supabase;

  const { error } = await adminClient.from("baby").insert({
    first_name,
    last_name,
    predicted_name,
    predicted_date,
    predicted_weight: weight,
    predicted_height: height,
  });

  if (error) {
    return { ok: false, message: `Impossible d'enregistrer : ${error.message}` };
  }

  try {
    revalidatePath("/baby");
  } catch (e) {
    // best-effort
  }

  return { ok: true, message: "Merci — ta prédiction a été enregistrée." };
}
