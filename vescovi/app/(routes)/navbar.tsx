"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Navbar() {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <nav className="flex items-center justify-between px-6 py-4 bg-green-950 border-b border-white/10">
            <div
                className="text-2xl font-bold cursor-pointer"
                onClick={() => router.push('/')}
            >
                ⚽ Vescovi.fr
            </div>

            <div className="flex gap-6 items-center">
                <button onClick={() => router.push('/profile')} className="hover:text-green-400 transition">
                    Profil
                </button>
                <button onClick={() => router.push('/team')} className="hover:text-green-400 transition">
                    Mon équipe
                </button>
                <button onClick={() => router.push('/ranking')} className="hover:text-green-400 transition">
                    Classement
                </button>

                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg transition"
                >
                    Déconnexion
                </button>
            </div>
        </nav>
    );
}
