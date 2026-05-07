"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

const baseNavItems = [
    { label: "Créer mon équipe", href: "/team", icon: "XI" },
    { label: "Voir mon équipe", href: "/view-team", icon: "MT" },
    { label: "Classement", href: "/ranking", icon: "#1" },
];

type NavbarProps = {
    canAccessAdmin: boolean;
};

export default function Navbar({ canAccessAdmin }: NavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const navItems = canAccessAdmin
        ? [...baseNavItems, { label: "Admin points", href: "/admin/points", icon: "ADM" }]
        : baseNavItems;

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
        <nav className="sticky top-0 z-50 border-b border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),linear-gradient(135deg,#052e16_0%,#064e3b_48%,#111827_100%)] px-3 py-2 text-white shadow-2xl shadow-black/30 backdrop-blur sm:px-6 sm:py-3">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="group flex w-fit cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 pl-1.5 pr-3 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-yellow-300/70 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-yellow-300 sm:gap-3 sm:py-2 sm:pl-2 sm:pr-5"
                    aria-label="Retour a l'accueil"
                >
                    <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-yellow-300/80 transition group-hover:rotate-6 sm:h-12 sm:w-12">
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
                        <span className="block text-base font-black tracking-wide text-yellow-200 sm:text-xl">
                            Vescovi.fr
                        </span>
                        <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80 sm:block">
                            Coupe du monde
                        </span>
                    </span>
                </button>

                <div className="flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2 sm:overflow-visible sm:pb-0">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <button
                                key={item.href}
                                type="button"
                                onClick={() => router.push(item.href)}
                                className={[
                                    "group relative flex shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1.5 text-xs font-bold transition duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                                    isActive
                                        ? "border-yellow-300 bg-yellow-300 text-green-950 shadow-lg shadow-yellow-500/20"
                                        : "border-white/15 bg-white/10 text-emerald-50 hover:-translate-y-0.5 hover:border-yellow-300/70 hover:bg-white/15 hover:text-yellow-100",
                                ].join(" ")}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/70 text-[10px] font-black text-yellow-200 ring-1 ring-white/20 transition group-hover:scale-110 group-hover:bg-yellow-300 group-hover:text-green-950 sm:h-7 sm:w-7" aria-hidden="true">
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-red-300/40 bg-red-500/90 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                    >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-950/30 text-[10px] font-black ring-1 ring-white/20 sm:h-7 sm:w-7" aria-hidden="true">
                            OUT
                        </span>
                        <span>Deconnexion</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
