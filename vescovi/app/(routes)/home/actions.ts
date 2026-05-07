"use server";

import { createClient } from "@/lib/supabaseServer";

export type HomeChatMessage = {
    id: string;
    user_id: string;
    author_name: string;
    content: string;
    created_at: string;
};

export type SendHomeChatMessageResult = {
    ok: boolean;
    message: string;
    createdMessage?: HomeChatMessage;
};

function normalizeMessage(content: string) {
    return content.trim();
}

function buildAuthorName(profile: { first_name: string | null; last_name: string | null } | null, email: string | null) {
    const fullName = [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean).join(" ");

    if (fullName) {
        return fullName;
    }

    if (email && email.includes("@")) {
        return email.split("@")[0];
    }

    return "Parieur";
}

export async function sendHomeChatMessage(content: string): Promise<SendHomeChatMessageResult> {
    const normalized = normalizeMessage(content);

    if (!normalized) {
        return {
            ok: false,
            message: "Le message est vide.",
        };
    }

    if (normalized.length > 280) {
        return {
            ok: false,
            message: "Le message ne peut pas dépasser 280 caractères.",
        };
    }

    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            ok: false,
            message: "Tu dois être connecté pour envoyer un message.",
        };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name,last_name")
        .eq("id", user.id)
        .maybeSingle();

    const authorName = buildAuthorName(profile, user.email ?? null);

    const { data, error } = await supabase
        .from("chat_messages")
        .insert({
            user_id: user.id,
            author_name: authorName,
            content: normalized,
        })
        .select("id,user_id,author_name,content,created_at")
        .single();

    if (error || !data) {
        return {
            ok: false,
            message: `Impossible d'envoyer le message : ${error?.message ?? "erreur inconnue"}`,
        };
    }

    return {
        ok: true,
        message: "Message envoyé.",
        createdMessage: data,
    };
}

