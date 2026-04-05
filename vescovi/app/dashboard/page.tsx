'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        // vérifier session
        supabaseClient.auth.getUser().then(({ data }) => {
            if (!data.user) {
                router.replace('/login')
            } else {
                setUser(data.user)
            }
        })

        // écouter logout
        const { data: listener } = supabaseClient.auth.onAuthStateChange(
            (_event, session) => {
                if (!session) {
                    router.replace('/login')
                }
            }
        )

        return () => {
            listener.subscription.unsubscribe()
        }
    }, [router])

    const handleLogout = async () => {
        await supabaseClient.auth.signOut()
        router.replace('/login')
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Chargement...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md text-center">
                <h1 className="text-xl font-semibold mb-4">Dashboard</h1>

                <p className="mb-4">
                    Connecté en tant que :
                    <br />
                    <strong>{user.email}</strong>
                </p>

                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                >
                    Se déconnecter
                </button>
            </div>
        </div>
    )
}