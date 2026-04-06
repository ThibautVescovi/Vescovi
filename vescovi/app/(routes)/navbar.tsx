"use client";

import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Navbar() {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    return (
        <nav className="relative h-20 flex items-center justify-between px-8 overflow-hidden border-b border-white/10">

            {/* 🌱 Background pelouse */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/grass.jpg')" }}
            />

            {/* 🌙 Overlay sombre */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/40" />

            {/* ✨ Glow subtil */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.25),transparent_70%)]" />

            {/* CONTENU */}
            <div className="relative flex items-center justify-between w-full">

                {/* ⚽ LOGO */}
                <Link href="/" className="flex items-center group">
                    <div className="h-12 flex items-center">
                        <Image
                            src="/logo.png"
                            alt="Vescovi.fr"
                            width={180}
                            height={60}
                            className="object-contain group-hover:scale-105 transition"
                            priority
                        />
                    </div>
                </Link>

                {/* MENU */}
                <div className="flex items-center gap-8 text-sm font-semibold tracking-wide">

                    <Link href="/profile" className="hover:text-green-400 transition">
                        Profil
                    </Link>

                    <Link href="/team" className="hover:text-green-400 transition">
                        Mon équipe
                    </Link>

                    <Link href="/ranking" className="hover:text-green-400 transition">
                        Classement
                    </Link>

                    {/* 🔴 Logout */}
                    <button
                        onClick={handleLogout}
                        className="ml-4 bg-red-500/90 hover:bg-red-600 px-4 py-2 rounded-xl transition shadow-lg"
                    >
                        Déconnexion
                    </button>
                </div>
            </div>

            {/* ⚽ Ligne terrain */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/30" />
        </nav>
    );
}