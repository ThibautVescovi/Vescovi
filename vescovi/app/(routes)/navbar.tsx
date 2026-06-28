"use client";

import Image from "next/image";
import {usePathname, useRouter} from "next/navigation";
import {supabaseClient} from "@/lib/supabaseClient";

const baseNavItems = [
    {label: "Classement", href: "/ranking", icon: "#1"},
    {label: "KiKiLa?", href: "/kikila", icon: "K?"},
    // {label: "Changements", href: "/admin/changes", icon: "CHG"},
    {label: "Mon équipe", href: "/view-team", icon: "ME"},
    {label: "Modifier mon équipe", href: "/team", icon: "XI"},
    {label: "Règles", href: "/rules", icon: "RG"},
];

type NavbarProps = {
    canAccessAdmin: boolean;
};

export default function Navbar({canAccessAdmin}: NavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const navItems = canAccessAdmin
        ? [
            ...baseNavItems,
            {label: "Admin Points", href: "/admin/points", icon: "ADM"},
        ]
        : baseNavItems;

    const handleLogout = async () => {
        const {error} = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Erreur lors de la deconnexion", error);
            return;
        }

        router.replace("/login");
        router.refresh();
    };

    return (
        <nav
            className="sticky top-0 z-50 border-b border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),linear-gradient(135deg,#052e16_0%,#064e3b_48%,#111827_100%)] px-3 py-2 text-white shadow-2xl shadow-black/30 backdrop-blur sm:px-6 sm:py-3">
            <div
                className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="group flex w-fit cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 pl-1.5 pr-3 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-yellow-300/70 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-yellow-300 sm:gap-3 sm:py-2 sm:pl-2 sm:pr-5"
                    aria-label="Retour a l'accueil"
                >
                    <span
                        className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-yellow-300/80 transition group-hover:rotate-6 sm:h-12 sm:w-12">
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
                        <span
                            className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80 sm:block">
                            Coupe du monde
                        </span>
                    </span>
                </button>

                <div
                    className="flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2 sm:overflow-visible sm:pb-0">
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
                                <span
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/70 text-[10px] font-black text-yellow-200 ring-1 ring-white/20 transition group-hover:scale-110 group-hover:bg-yellow-300 group-hover:text-green-950 sm:h-7 sm:w-7"
                                    aria-hidden="true">
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-white/40 transition hover:border-red-300/40 hover:bg-red-500/20 hover:text-white/70 focus:outline-none focus:ring-1 focus:ring-red-300/50 sm:px-3 sm:py-2"
                        title="Déconnexion"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
                        </svg>
                        <span className="hidden sm:inline">Déconnexion</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
