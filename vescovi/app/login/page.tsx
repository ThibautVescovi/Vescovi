'use client'

import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import AuthForm from '@/components/AuthForm'

export default function LoginPage() {
    const router = useRouter()

    useEffect(() => {
        // check session au chargement
        supabaseClient.auth.getSession().then(({data}) => {
            if (data.session) {
                router.push('/dashboard')
            }
        })

        // écoute changement login/logout
        const {data: listener} = supabaseClient.auth.onAuthStateChange(
            (_event, session) => {
                if (session) {
                    router.push('/dashboard')
                }
            }
        )

        return () => {
            listener.subscription.unsubscribe()
        }
    }, [router])

    return (
        <div
            className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
            style={{backgroundImage: "url('/bg-login.webp')"}}
        >
            <div className="absolute inset-0 bg-black/40"></div>

            <div className="relative bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-md w-full max-w-md">
                <h1 className="text-xl font-semibold mb-4">Connexion</h1>
                <AuthForm/>
            </div>
        </div>
    )
}