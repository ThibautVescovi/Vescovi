"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

const navItems = [
    { label: "Profil", href: "/profile", icon: "FC" },
    { label: "Mon équipe", href: "/team", icon: "XI" },
    { label: "Classement", href: "/ranking", icon: "#1" },
];

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Erreur lors de la deconnexion", error);
            return;
        }

        router.replace("/login");
        router.refresh();
    };

    return (
        <nav className="sticky top-0 z-50 border-b border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),linear-gradient(135deg,#052e16_0%,#064e3b_48%,#111827_100%)] px-4 py-3 text-white shadow-2xl shadow-black/30 backdrop-blur sm:px-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="group flex w-fit cursor-pointer items-center gap-3 rounded-full border border-white/15 bg-white/10 py-2 pl-2 pr-5 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-yellow-300/70 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    aria-label="Retour a l'accueil"
                >
                    <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-yellow-300/80 transition group-hover:rotate-6">
                        <Image
                            src="/logo.png"
                            alt="Logo Vescovi.fr"
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                            priority
                        />
                    </span>
                    <span className="leading-tight">
                        <span className="block text-lg font-black tracking-wide text-yellow-200 sm:text-xl">
                            Vescovi.fr
                        </span>
                        <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80">
                            Coupe du monde
                        </span>
                    </span>
                </button>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <button
                                key={item.href}
                                type="button"
                                onClick={() => router.push(item.href)}
                                className={[
                                    "group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-sm font-bold transition duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-300",
                                    isActive
                                        ? "border-yellow-300 bg-yellow-300 text-green-950 shadow-lg shadow-yellow-500/20"
                                        : "border-white/15 bg-white/10 text-emerald-50 hover:-translate-y-0.5 hover:border-yellow-300/70 hover:bg-white/15 hover:text-yellow-100",
                                ].join(" ")}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950/70 text-[10px] font-black text-yellow-200 ring-1 ring-white/20 transition group-hover:scale-110 group-hover:bg-yellow-300 group-hover:text-green-950" aria-hidden="true">
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex cursor-pointer items-center gap-2 rounded-full border border-red-300/40 bg-red-500/90 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-950/30 text-[10px] font-black ring-1 ring-white/20" aria-hidden="true">
                            OUT
                        </span>
                        <span>Deconnexion</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
