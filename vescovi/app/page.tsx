'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
    const [name, setName] = useState('Invité')

    useEffect(() => {
        const fetchUser = async () => {
            const { data: users, error } = await supabase
                .from('users')
                .select('name')
                .limit(1)

            if (users && users.length > 0) {
                setName(users[0].name)
            } else {
                console.log('Erreur Supabase:', error)
            }
        }
        fetchUser()
    }, [])

    return <h1>Bonjour {name} 👋</h1>
}