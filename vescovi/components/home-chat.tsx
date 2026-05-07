"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { sendHomeChatMessage, type HomeChatMessage } from "@/app/(routes)/home/actions";
import { supabaseClient } from "@/lib/supabaseClient";

type HomeChatProps = {
    initialMessages: HomeChatMessage[];
    currentUserId: string | null;
    loadError: string | null;
};

function isIncomingChatMessage(payload: unknown): payload is HomeChatMessage {
    if (!payload || typeof payload !== "object") {
        return false;
    }

    const value = payload as Record<string, unknown>;

    return (
        typeof value.id === "string" &&
        typeof value.user_id === "string" &&
        typeof value.author_name === "string" &&
        typeof value.content === "string" &&
        typeof value.created_at === "string"
    );
}

function formatDateTime(date: string) {
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(date));
}

function addMessageIfMissing(messages: HomeChatMessage[], nextMessage: HomeChatMessage) {
    if (messages.some((message) => message.id === nextMessage.id)) {
        return messages;
    }

    return [...messages, nextMessage];
}

export default function HomeChat({ initialMessages, currentUserId, loadError }: HomeChatProps) {
    const [messages, setMessages] = useState<HomeChatMessage[]>(initialMessages);
    const [content, setContent] = useState("");
    const [status, setStatus] = useState<string | null>(loadError);
    const [isSending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    useEffect(() => {
        const channel = supabaseClient
            .channel("home-chat-messages")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                },
                (payload) => {
                    const incoming = payload.new;

                    if (!isIncomingChatMessage(incoming)) {
                        return;
                    }

                    setMessages((current) => addMessageIfMissing(current, incoming));
                },
            )
            .subscribe();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (!scrollRef.current) {
            return;
        }

        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const remainingCharacters = useMemo(() => 280 - content.length, [content.length]);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!content.trim()) {
            return;
        }

        startTransition(async () => {
            const result = await sendHomeChatMessage(content);
            setStatus(result.message);

            if (!result.ok || !result.createdMessage) {
                return;
            }

            const createdMessage = result.createdMessage;
            setMessages((current) => addMessageIfMissing(current, createdMessage));
            setContent("");
        });
    }

    return (
        <section id="chat" className="scroll-mt-28">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">Chat live</p>
                    <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Discute avec les autres parieurs</h2>
                </div>
                <p className="max-w-xl text-sm leading-7 text-emerald-50/75">
                    Un salon simple pour partager tes pronos, tes coups de coeur et les infos de dernière minute.
                </p>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur">
                <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto p-5">
                    {messages.length === 0 ? (
                        <p className="rounded-xl border border-white/10 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-50/80">
                            Aucun message pour le moment. Lance la conversation.
                        </p>
                    ) : (
                        messages.map((message) => {
                            const isMine = currentUserId === message.user_id;

                            return (
                                <article
                                    key={message.id}
                                    className={[
                                        "rounded-xl border px-4 py-3",
                                        isMine
                                            ? "border-yellow-300/40 bg-yellow-300/15"
                                            : "border-white/10 bg-emerald-950/35",
                                    ].join(" ")}
                                >
                                    <div className="flex items-center justify-between gap-3 text-xs text-emerald-50/70">
                                        <span className="font-bold uppercase tracking-[0.14em] text-yellow-200">
                                            {isMine ? "Moi" : message.author_name}
                                        </span>
                                        <time>{formatDateTime(message.created_at)}</time>
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/90">
                                        {message.content}
                                    </p>
                                </article>
                            );
                        })
                    )}
                </div>

                <form onSubmit={handleSubmit} className="border-t border-white/10 bg-emerald-950/35 p-4">
                    <label className="block">
                        <span className="sr-only">Ton message</span>
                        <textarea
                            rows={3}
                            value={content}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setContent(nextValue.length > 280 ? nextValue.slice(0, 280) : nextValue);
                                if (status) {
                                    setStatus(null);
                                }
                            }}
                            placeholder="Écris ton message..."
                            className="w-full resize-none rounded-xl border border-white/15 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/60"
                        />
                    </label>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold text-emerald-50/75">
                            {remainingCharacters} caractère{remainingCharacters > 1 ? "s" : ""} restant
                            {remainingCharacters > 1 ? "s" : ""}
                        </p>
                        <button
                            type="submit"
                            disabled={isSending || !content.trim()}
                            className="rounded-full border border-yellow-300 bg-yellow-300 px-5 py-2 text-sm font-black text-emerald-950 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-500"
                        >
                            {isSending ? "Envoi..." : "Envoyer"}
                        </button>
                    </div>

                    {status ? (
                        <p className="mt-3 text-xs font-semibold text-emerald-50/80">{status}</p>
                    ) : null}
                </form>
            </div>
        </section>
    );
}


