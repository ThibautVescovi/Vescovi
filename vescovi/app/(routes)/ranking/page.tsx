import {createClient} from "@/lib/supabaseServer";
import Link from "next/link";

type RankingEntry = {
    rank: number;
    teamId: string;
    userId: string;
    teamName: string;
    firstName: string | null;
    lastName: string | null;
    pronostiqueurName: string;
    totalPoints: number;
    wineName: string | null;
    isApproved: boolean;
};

function formatPronostiqueurName(firstName: string | null, lastName: string | null): string {
    const safeFirstName = firstName?.trim() ?? "";
    const safeLastName = lastName?.trim() ?? "";

    if (safeFirstName && safeLastName) {
        return `${safeFirstName} ${safeLastName.charAt(0).toUpperCase()}.`;
    }

    if (safeFirstName) {
        return safeFirstName;
    }

    if (safeLastName) {
        return `${safeLastName.charAt(0).toUpperCase()}.`;
    }

    return "Joueur inconnu";
}

export default async function RankingPage() {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();

    // Fetch computed scores from the view, joined with profiles and entries
    const {data: scores} = await supabase
        .from("team_scores")
        .select(`
            team_id,
            team_name,
            user_id,
            total_points,
            profiles:user_id (first_name, last_name),
            entries!entries_team_id_fkey (wine_name, is_approved)
        `)
        .order("total_points", {ascending: false});

    const rankings: RankingEntry[] = (scores ?? []).map((row, index) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const entry = Array.isArray(row.entries) ? row.entries[0] : row.entries;
        return {
            rank: index + 1,
            teamId: row.team_id,
            userId: row.user_id,
            teamName: row.team_name,
            firstName: profile?.first_name ?? null,
            lastName: profile?.last_name ?? null,
            pronostiqueurName: formatPronostiqueurName(profile?.first_name ?? null, profile?.last_name ?? null),
            totalPoints: row.total_points ?? 0,
            wineName: entry?.wine_name ?? null,
            isApproved: entry?.is_approved ?? false,
        };
    });

    const currentUserRank = rankings.find((r) => {
        const row = (scores ?? []).find((s) => s.team_id === r.teamId);
        return row?.user_id === user?.id;
    });

    const medals = ["🥇", "🥈", "🥉"];

    return (
        <div
            className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_28%)]">
            <div
                className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_48px,rgba(255,255,255,0.05)_50px)]"/>
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-emerald-950/40"/>

            <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
                {/* Header */}
                <div className="mb-10 text-center">
                    <span
                        className="mb-4 inline-flex items-center rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-yellow-200">
                        Classement général
                    </span>
                    <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                        🏆 Classement
                    </h1>
                    <p className="mt-3 text-emerald-50/75 text-base sm:text-lg">
                        Points cumulés sur l&apos;ensemble des matches joués.
                    </p>
                </div>

                {/* Podium top 3 */}
                {rankings.length >= 1 && (
                    <div className="mb-10 grid gap-4 sm:grid-cols-3">
                        {rankings.slice(0, 3).map((entry) => {
                            const isMe = entry.teamId === currentUserRank?.teamId;
                            const medal = medals[entry.rank - 1];
                            const podiumColors = [
                                "from-yellow-300/30 border-yellow-300/60",
                                "from-slate-300/20 border-slate-300/40",
                                "from-orange-400/20 border-orange-400/40",
                            ];
                            return (
                                <div
                                    key={entry.teamId}
                                    className={`relative overflow-hidden rounded-[1.5rem] border bg-gradient-to-br ${podiumColors[entry.rank - 1]} via-white/5 to-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur ${isMe ? "ring-2 ring-yellow-300" : ""}`}
                                >
                                    {isMe && (
                                        <span
                                            className="absolute right-3 top-3 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black text-emerald-950">
                                            Moi
                                        </span>
                                    )}
                                    <p className="text-3xl">{medal}</p>
                                    <Link
                                        href={`/view-team?teamId=${entry.teamId}&userId=${entry.userId}`}
                                        className="block truncate text-sm text-emerald-50/70 underline-offset-2 transition hover:text-yellow-200 hover:underline"
                                    >
                                        <p className="mt-2 text-lg font-black text-white leading-tight">
                                            {entry.pronostiqueurName}
                                        </p>
                                    </Link>

                                    <Link
                                        href={`/view-team?teamId=${entry.teamId}&userId=${entry.userId}`}
                                        className="block truncate text-sm text-emerald-50/70 underline-offset-2 transition hover:text-yellow-200 hover:underline"
                                    >
                                        {entry.teamName}
                                    </Link>
                                    <p className="mt-3 text-3xl font-black text-yellow-300">
                                        {entry.totalPoints}
                                        <span className="ml-1 text-base font-semibold text-yellow-200/70">pts</span>
                                    </p>
                                    {entry.wineName && (
                                        <p className="mt-1 text-xs text-emerald-50/60 italic truncate">🍾 {entry.wineName}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Full table */}
                {rankings.length === 0 ? (
                    <div
                        className="rounded-[1.5rem] border border-white/10 bg-white/10 p-10 text-center text-emerald-50/70 shadow-xl backdrop-blur">
                        Aucune équipe enregistrée pour le moment.
                    </div>
                ) : (
                    <div
                        className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur">
                        {/* Desktop table */}
                        <table className="hidden w-full sm:table">
                            <thead>
                            <tr className="border-b border-white/10 bg-emerald-950/40 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
                                <th className="px-6 py-4 text-left">#</th>
                                <th className="px-6 py-4 text-left">Pronostiqueur</th>
                                <th className="px-6 py-4 text-left">Équipe</th>
                                <th className="px-6 py-4 text-left">Validation</th>
                                <th className="px-6 py-4 text-left">Vin engagé</th>
                                <th className="px-6 py-4 text-right">Points</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rankings.map((entry, i) => {
                                const isMe = entry.teamId === currentUserRank?.teamId;
                                const isTop3 = entry.rank <= 3;
                                return (
                                    <tr
                                        key={entry.teamId}
                                        className={`border-b border-white/5 transition ${isMe ? "bg-yellow-300/10" : i % 2 === 0 ? "bg-white/5" : ""} hover:bg-white/10`}
                                    >
                                        <td className="px-6 py-4 text-lg">
                                            {isTop3 ? medals[entry.rank - 1] :
                                                <span className="font-bold text-emerald-50/60">{entry.rank}</span>}
                                        </td>
                                        <td className="px-6 py-4">

                                            <Link
                                                href={`/view-team?teamId=${entry.teamId}&userId=${entry.userId}`}
                                                className="underline-offset-2 transition hover:text-yellow-200 hover:underline"
                                            >
                                                                                                   <span
                                                                                                       className="font-bold text-white">
                                                    {entry.pronostiqueurName}
                                                </span>
                                            </Link>
                                            {isMe && (
                                                <span
                                                    className="ml-2 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black text-emerald-950">
                                                        Moi
                                                    </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-emerald-50/80 text-sm">
                                            <Link
                                                href={`/view-team?teamId=${entry.teamId}&userId=${entry.userId}`}
                                                className="underline-offset-2 transition hover:text-yellow-200 hover:underline"
                                            >
                                                {entry.teamName}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${entry.isApproved
                                                        ? "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30"
                                                        : "bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/30"
                                                    }`}
                                                >
                                                    {entry.isApproved ? "Validée" : "En attente"}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-emerald-50/60 text-sm italic">
                                            {entry.wineName ? `🍾 ${entry.wineName}` : "–"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                                <span
                                                    className={`text-xl font-black ${isTop3 ? "text-yellow-300" : "text-white"}`}>
                                                    {entry.totalPoints}
                                                </span>
                                            <span className="ml-1 text-xs text-emerald-50/50">pts</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>

                        {/* Mobile cards */}
                        <ul className="flex flex-col divide-y divide-white/10 sm:hidden">
                            {rankings.map((entry) => {
                                const isMe = entry.teamId === currentUserRank?.teamId;
                                const isTop3 = entry.rank <= 3;
                                return (
                                    <li
                                        key={entry.teamId}
                                        className={`flex items-center gap-4 px-4 py-4 ${isMe ? "bg-yellow-300/10" : ""}`}
                                    >
                                        <span
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-950/50 text-xl font-black ring-1 ring-white/10">
                                            {isTop3 ? medals[entry.rank - 1] : entry.rank}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-white truncate">
                                                {entry.pronostiqueurName}
                                                {isMe && (
                                                    <span
                                                        className="ml-1.5 rounded-full bg-yellow-300 px-1.5 py-0.5 text-[9px] font-black text-emerald-950">
                                                        Moi
                                                    </span>
                                                )}
                                            </p>
                                            <Link
                                                href={`/view-team?teamId=${entry.teamId}&userId=${entry.userId}`}
                                                className="block truncate text-xs text-emerald-50/60 underline-offset-2 transition hover:text-yellow-200 hover:underline"
                                            >
                                                {entry.teamName}
                                            </Link>
                                            <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${entry.isApproved
                                                ? "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30"
                                                : "bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/30"
                                            }`}>
                                                {entry.isApproved ? "Validée" : "En attente"}
                                            </p>
                                            {entry.wineName && (
                                                <p className="text-xs text-emerald-50/50 italic truncate">🍾 {entry.wineName}</p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-xl font-black ${isTop3 ? "text-yellow-300" : "text-white"}`}>
                                                {entry.totalPoints}
                                            </p>
                                            <p className="text-[10px] text-emerald-50/50">pts</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* My rank highlight if not top 3 */}
                {currentUserRank && currentUserRank.rank > 3 && (
                    <div
                        className="mt-6 flex items-center gap-4 rounded-[1.25rem] border border-yellow-300/30 bg-yellow-300/10 px-5 py-4 shadow-lg shadow-black/10 backdrop-blur">
                        <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-300/20 font-black text-yellow-300 ring-1 ring-yellow-300/30 text-lg">
                            {currentUserRank.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-white">
                                {currentUserRank.pronostiqueurName}
                                <span
                                    className="ml-2 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black text-emerald-950">
                                    Moi
                                </span>
                            </p>
                            <p className="text-xs text-emerald-50/60">{currentUserRank.teamName}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-xl font-black text-yellow-300">{currentUserRank.totalPoints}</p>
                            <p className="text-[10px] text-emerald-50/50">pts</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
