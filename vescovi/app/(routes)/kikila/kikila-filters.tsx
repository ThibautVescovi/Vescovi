"use client";

import type { ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CountryOption = {
    code: string;
    name: string;
};

type PlayerOption = {
    id: string;
    name: string;
    position: string;
};

type KiKiLaFiltersProps = {
    countries: CountryOption[];
    players: PlayerOption[];
    selectedCountryCode: string;
    selectedPlayerId: string;
};

export default function KiKiLaFilters({
    countries,
    players,
    selectedCountryCode,
    selectedPlayerId,
}: KiKiLaFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const currentSearchParams = useSearchParams();

    const updateQuery = (nextCountry: string, nextPlayerId: string) => {
        const query = new URLSearchParams(currentSearchParams.toString());

        if (nextCountry) {
            query.set("country", nextCountry);
        } else {
            query.delete("country");
        }

        if (nextPlayerId) {
            query.set("playerId", nextPlayerId);
        } else {
            query.delete("playerId");
        }

        const queryString = query.toString();
        router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    };

    const handleCountryChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const nextCountry = event.target.value;
        // Changing country resets the selected player to avoid stale IDs.
        updateQuery(nextCountry, "");
    };

    const handlePlayerChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const nextPlayerId = event.target.value;
        updateQuery(selectedCountryCode, nextPlayerId);
    };

    return (
        <div className="grid gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-xl shadow-black/20 sm:grid-cols-2 sm:p-6">
            <div className="space-y-2">
                <label htmlFor="country" className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                    Pays
                </label>
                <select
                    id="country"
                    name="country"
                    value={selectedCountryCode}
                    onChange={handleCountryChange}
                    className="w-full rounded-lg border border-white/20 bg-emerald-950/70 px-3 py-2.5 text-sm text-white outline-none ring-0 transition focus:border-yellow-300"
                >
                    <option value="">Selectionner un pays</option>
                    {countries.map((entry) => (
                        <option key={entry.code} value={entry.code}>
                            {entry.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label htmlFor="playerId" className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/80">
                    Joueur
                </label>
                <select
                    id="playerId"
                    name="playerId"
                    value={selectedPlayerId}
                    onChange={handlePlayerChange}
                    disabled={!selectedCountryCode || players.length === 0}
                    className="w-full rounded-lg border border-white/20 bg-emerald-950/70 px-3 py-2.5 text-sm text-white outline-none ring-0 transition disabled:cursor-not-allowed disabled:opacity-50 focus:border-yellow-300"
                >
                    <option value="">{selectedCountryCode ? "Selectionner un joueur" : "Choisis d'abord un pays"}</option>
                    {players.map((player) => (
                        <option key={player.id} value={player.id}>
                            {player.name} ({player.position})
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}


