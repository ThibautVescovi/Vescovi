const compositionRules = [
    "Votre équipe doit contenir 11 joueurs.",
    "La composition obligatoire est : 1 gardien, 4 défenseurs, 3 milieux, 3 attaquants.",
    "Votre équipe doit représenter au minimum 5 nationalités.",
    "Vous ne pouvez pas sélectionner plus de 3 joueurs d'une même nationalité.",
];

const gameRules = [
    "Chaque participant engage une bouteille de vin d'une valeur minimum de 10 €.",
    "A la fin du concours, les bouteilles sont réparties entre les 3 premiers selon le nombre de participants.",
    "Vous pouvez effectuer jusqu'à 2 changements entre la phase de poules et la phase finale, tout en respectant les règles de composition.",
    "Tous les matchs du tournoi comptent dans le total des points, y compris le match pour la 3ème place.",
];

const scoringRules = [
    { label: "Gardien n'encaisse pas de but", points: "+5 points" },
    { label: "Gardien encaisse un but", points: "-1 point / but" },
    { label: "Défenseur n'encaisse pas de but", points: "+2 points" },
    { label: "Défenseur encaisse un but", points: "-1 point / but" },
    { label: "Joueur marque un but", points: "+5 points / but" },
    { label: "Joueur présent tout le match", points: "+2 points" },
    { label: "Joueur remplacé", points: "+1 point" },
    { label: "Joueur entrant", points: "+1 point" },
    { label: "Joueur carton jaune", points: "-2 points" },
    { label: "Joueur carton rouge", points: "-5 points" },
];

export default function RulesPage() {
    return (
        <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_28%)]">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_48px,rgba(255,255,255,0.05)_50px)] opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-emerald-950/40" />

            <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
                <header className="mb-8 text-center sm:mb-10">
                    <span className="mb-4 inline-flex items-center rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-yellow-200">
                        Règlement officiel
                    </span>
                    <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Règles du jeu</h1>
                    <p className="mx-auto mt-4 max-w-3xl text-sm text-emerald-50/80 sm:text-base">
                        Retrouvez ici le fonctionnement complet du concours, les contraintes de composition et le barème exact des points.
                    </p>
                </header>

                <section className="grid gap-5 sm:grid-cols-2">
                    <article className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/15 backdrop-blur sm:p-6">
                        <h2 className="text-xl font-black text-white">Composition de l&apos;équipe</h2>
                        <ul className="mt-4 space-y-3 text-sm leading-7 text-emerald-50/85 sm:text-base">
                            {compositionRules.map((rule) => (
                                <li key={rule} className="rounded-xl border border-white/10 bg-emerald-950/25 px-3 py-2">
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </article>

                    <article className="rounded-[1.5rem] border border-yellow-300/25 bg-gradient-to-br from-yellow-300/10 via-white/10 to-white/5 p-5 shadow-xl shadow-black/15 backdrop-blur sm:p-6">
                        <h2 className="text-xl font-black text-white">Déroulé du concours</h2>
                        <ul className="mt-4 space-y-3 text-sm leading-7 text-emerald-50/85 sm:text-base">
                            {gameRules.map((rule) => (
                                <li key={rule} className="rounded-xl border border-white/10 bg-emerald-950/30 px-3 py-2">
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </article>
                </section>

                <section className="mt-8 sm:mt-10">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-2xl font-black text-white sm:text-3xl">Barème des points</h2>
                        <span className="rounded-full border border-yellow-300/40 bg-yellow-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-200 sm:text-xs">
                            Mise à jour 2026
                        </span>
                    </div>

                    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur">
                        <table className="hidden w-full sm:table">
                            <thead>
                                <tr className="border-b border-white/10 bg-emerald-950/40 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
                                    <th className="px-6 py-4 text-left">Action en match</th>
                                    <th className="px-6 py-4 text-right">Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scoringRules.map((rule, index) => (
                                    <tr key={rule.label} className={index % 2 === 0 ? "bg-white/5" : ""}>
                                        <td className="px-6 py-4 text-sm text-emerald-50/85">{rule.label}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-white">{rule.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <ul className="divide-y divide-white/10 sm:hidden">
                            {scoringRules.map((rule) => (
                                <li key={rule.label} className="flex items-center justify-between gap-3 px-4 py-4">
                                    <span className="text-sm text-emerald-50/85">{rule.label}</span>
                                    <span className="shrink-0 rounded-full bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-yellow-200 ring-1 ring-white/15">
                                        {rule.points}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </main>
        </div>
    );
}


