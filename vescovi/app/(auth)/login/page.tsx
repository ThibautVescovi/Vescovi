import {redirect} from 'next/navigation'
import AuthForm from '@/components/AuthForm'
import {createClient} from '@/lib/supabaseServer'

export default async function LoginPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        redirect('/home')
    }

    return (
        <div
            className="relative min-h-screen bg-cover bg-center flex items-center justify-center px-4 py-8"
            style={{backgroundImage: "url('/bg-login.webp')"}}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50"></div>

            {/* Card */}
            <div
                className="
        relative
        w-full
        max-w-md
        rounded-2xl
        bg-white/90
        backdrop-blur-md
        p-6
        sm:p-8
        shadow-2xl
        text-black
      "
            >
                <img
                    src="/logo.png"
                    alt="Vescovi"
                    className="h-24 w-auto mx-auto mb-2 scale-150 sm:h-28"
                />
                <h1 className="text-2xl font-bold mb-6 text-center">
                    Connexion
                </h1>

                <AuthForm/>
            </div>
        </div>
    )
}
