"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from './supabase-server';

export type SaveBabyPayload = {
  first_name?: string | null;
  last_name?: string | null;
  predicted_name?: string | null;
  predicted_date?: string | null;
  weight?: number | null;
  height?: number | null;
};

export type SaveBabyResult = {
  ok: boolean;
  message: string;
};

export async function saveBaby(payload: SaveBabyPayload): Promise<SaveBabyResult> {
  const client = await createClient();

  // Validate: require predicted_name OR (first_name and/or last_name)
  const hasPredicted = !!(payload.predicted_name && payload.predicted_name.trim().length > 0);
  const hasFirstOrLast = !!(
    (payload.first_name && payload.first_name.trim().length > 0) ||
    (payload.last_name && payload.last_name.trim().length > 0)
  );

  if (!hasPredicted && !hasFirstOrLast) {
    return { ok: false, message: 'Il faut fournir un prénom prédit ou un prénom/nom.' };
  }

  const insertPayload = {
    first_name: payload.first_name ?? null,
    last_name: payload.last_name ?? null,
    predicted_name: payload.predicted_name ?? null,
    predicted_date: payload.predicted_date ?? null,
    weight: payload.weight ?? null,
    height: payload.height ?? null,
  };

  try {
    const { error } = await client.from('baby').insert(insertPayload);
    if (error) {
      return { ok: false, message: error.message };
    }
  } catch (err: any) {
    return { ok: false, message: err?.message ?? String(err) };
  }

  // Revalidate the baby page
  try {
    revalidatePath('/baby');
  } catch (e) {
    // ignore revalidation errors but do not fail the action
  }

  return { ok: true, message: 'Merci...' };
}
