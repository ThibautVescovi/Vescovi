export default function HomePage() {
    return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background terrain */}
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_48px,rgba(255,255,255,0.05)_50px)]" />

            <div className="z-10 text-center px-6">
                <h1 className="text-5xl font-extrabold mb-6">⚽ Vescovi.fr</h1>
                <p className="text-xl opacity-80 mb-10">
                    Bienvenue dans ton univers football
                </p>

                <div className="flex gap-6 flex-wrap justify-center">
                    <MenuCard title="👤 Profil" />
                    <MenuCard title="🧠 Mon équipe" />
                    <MenuCard title="🏆 Classement" />
                </div>
            </div>
        </div>
    );
}

function MenuCard({ title }: { title: string }) {
    return (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-8 py-6 hover:scale-105 transition shadow-lg">
            <h3 className="text-xl font-bold">{title}</h3>
        </div>
    );
}