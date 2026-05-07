import Image from "next/image";
import Link from "next/link";
import HomeChat from "@/components/home-chat";
import { createClient } from "@/lib/supabaseServer";
import type { HomeChatMessage } from "./actions";

const today = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
}).format(new Date());

const highlights = [
    "11 joueurs à sélectionner",
    "Minimum 5 nationalités",
    "2 changements possibles",
];

const news = [
    {
        id: 1,
        tag: "A la une",
        title: "Bienvenue sur Vescovi.fr",
        content:
            "Prépare ton onze idéal pour la coupe du monde 2026 et lance un concours de pronostics entre amis dans une ambiance conviviale, simple et pensée pour suivre chaque match.",
        date: today,
    },
    {
        id: 2,
        tag: "Rappel",
        title: "Compose une équipe qui respecte toutes les règles",
        content:
            "Ton onze doit contenir 1 gardien, 4 défenseurs, 3 milieux, 3 attaquants, au moins 5 nationalités et jamais plus de 3 joueurs d'un même pays.",
        date: today,
    },
    {
        id: 3,
        tag: "Astuce",
        title: "Pense déjà à la phase finale",
        content:
            "Deux changements seront possibles après les poules : anticipe dès maintenant les sélections les plus solides pour garder une longueur d'avance.",
        date: today,
    },
];

export default async function HomePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id,user_id,author_name,content,created_at")
        .order("created_at", { ascending: false })
        .limit(40);

    const initialMessages: HomeChatMessage[] = (messagesData ?? []).slice().reverse();

    return (
        <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_28%)]">
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_48px,rgba(255,255,255,0.05)_50px)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-emerald-950/40" />

            <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:px-8 lg:gap-14 lg:py-14">
                <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="text-left">
                        <span className="mb-4 inline-flex items-center rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-yellow-200">
                            Concours 2026
                        </span>

                        <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Vescovi.fr, le rendez-vous convivial pour vivre la coupe du monde 2026.
                        </h1>

                        <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/90 sm:text-xl">
                            Crée ton équipe idéale, compare tes choix et profite d’un vrai concours de pronostics entre amis autour des plus grandes affiches du tournoi.
                            Attention ce concours n'est pas ouvert au public, l'organisateur se réserve le droit de refuser toute inscription.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            {highlights.map((highlight) => (
                                <span
                                    key={highlight}
                                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-lg shadow-black/10"
                                >
                                    {highlight}
                                </span>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/team"
                                className="inline-flex items-center justify-center rounded-full border border-yellow-300 bg-yellow-300 px-6 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-yellow-500/20 transition hover:-translate-y-0.5 hover:bg-yellow-200"
                            >
                                Créer mon équipe
                            </Link>
                            <Link
                                href="/home#actualites"
                                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:border-yellow-300/70 hover:bg-white/15"
                            >
                                Voir les actualités
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -inset-4 rounded-[2rem] bg-yellow-300/10 blur-3xl" aria-hidden="true" />
                        <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-yellow-300/15 to-transparent" aria-hidden="true" />

                            <div className="relative flex flex-col items-center text-center">
                                <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border-4 border-yellow-300/80 bg-white shadow-2xl shadow-black/20 sm:h-56 sm:w-56">
                                    <Image
                                        src="/logo.png"
                                        alt="Logo Vescovi.fr"
                                        fill
                                        priority
                                        className="object-cover"
                                        sizes="(max-width: 640px) 192px, 224px"
                                    />
                                </div>

                                <p className="mt-6 text-sm font-bold uppercase tracking-[0.28em] text-yellow-200">
                                    Ton onze idéal pour 2026
                                </p>
                                <p className="mt-3 max-w-sm text-sm leading-7 text-emerald-50/85">
                                    Sélectionne tes meilleurs joueurs, surveille les points et prépare-toi à grimper au classement match après match.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <HomeChat
                    initialMessages={initialMessages}
                    currentUserId={user?.id ?? null}
                    loadError={messagesError?.message ?? null}
                />

                <NewsSection />

            </main>
        </div>
    );
}

function NewsSection() {
    const [featuredNews, ...secondaryNews] = news;

    return (
        <section id="actualites" className="scroll-mt-28">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-200">
                        Actualités
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                        Les infos à ne pas manquer
                    </h2>
                </div>
                <p className="max-w-xl text-sm leading-7 text-emerald-50/75">
                    Retrouve ici les annonces importantes du concours, les rappels de règles et les bons réflexes pour préparer ton équipe.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <article className="overflow-hidden rounded-[1.75rem] border border-yellow-300/30 bg-gradient-to-br from-yellow-300/15 via-white/10 to-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="rounded-full bg-yellow-300 px-3 py-1 font-black text-emerald-950">
                            {featuredNews.tag}
                        </span>
                        <time className="text-emerald-50/70">{featuredNews.date}</time>
                    </div>

                    <h3 className="mt-5 text-2xl font-black text-white sm:text-3xl">
                        {featuredNews.title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-emerald-50/85">
                        {featuredNews.content}
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-emerald-950/35 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">Format</p>
                            <p className="mt-2 text-sm text-white/85">Un onze complet à composer pour viser la victoire.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-emerald-950/35 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">Entre amis</p>
                            <p className="mt-2 text-sm text-white/85">Un défi convivial à partager pendant tout le Mondial.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-emerald-950/35 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">Stratégie</p>
                            <p className="mt-2 text-sm text-white/85">Anticipe les changements et maximise chaque point.</p>
                        </div>
                    </div>
                </article>

                <div className="grid gap-5">
                    {secondaryNews.map((item) => (
                        <article
                            key={item.id}
                            className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/15 backdrop-blur transition hover:-translate-y-1 hover:border-yellow-300/40 hover:bg-white/12"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="rounded-full border border-white/15 bg-emerald-950/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
                                    {item.tag}
                                </span>
                                <time className="text-xs text-emerald-50/65">{item.date}</time>
                            </div>

                            <h3 className="mt-4 text-xl font-black text-white">
                                {item.title}
                            </h3>
                            <p className="mt-3 text-sm leading-7 text-emerald-50/80">
                                {item.content}
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

