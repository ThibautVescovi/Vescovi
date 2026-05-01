// app/navbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

export default function Navbar() {
    const router = useRouter();

    const handleLogout = async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Erreur lors de la déconnexion", error);
            return;
        }

        router.replace("/login");
        router.refresh();
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
