'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'

export default function Home() {
    const router = useRouter()

    useEffect(() => {
        supabaseClient.auth.getSession().then(({ data }) => {
            if (data.session) {
                router.replace('/dashboard')
            } else {
                router.replace('/login')
            }
        })
    }, [router])

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Chargement...</p>
        </div>
    )
}