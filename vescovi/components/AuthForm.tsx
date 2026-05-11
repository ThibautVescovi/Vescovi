'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'

export default function AuthForm() {
    const router = useRouter()
    const [isLogin, setIsLogin] = useState(true)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [message, setMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isLogin) {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            })
            if (error) {
                setMessage(error.message)
            } else {
                router.replace('/home')
            }
        } else {
            const { error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                    },
                },
            })

            if (error) {
                setMessage(error.message)
            } else {
                router.replace('/login')
            }
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {!isLogin && (
                <>
                    <input
                        type="text"
                        placeholder="Prénom"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full border p-3 rounded text-black"
                    />

                    <input
                        type="text"
                        placeholder="Nom"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full border p-3 rounded text-black"
                    />
                </>
            )}

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border p-3 rounded text-black"
            />

            <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border p-3 rounded text-black"
            />

            <button
                type="submit"
                className="w-full bg-green-600 text-white p-3 rounded cursor-pointer hover:bg-green-700 transition"
            >
                {isLogin ? 'Se connecter' : "S'inscrire"}
            </button>

            <p
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-gray-500 cursor-pointer"
            >
                {isLogin
                    ? "Créer un compte"
                    : "J'ai déjà un compte"}
            </p>

            {message && <p className="text-sm">{message}</p>}
        </form>
    )
}
