import '../globals.css'
import Navbar from './navbar'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'


export default async function AppLayout({children}: { children: React.ReactNode }) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="bg-green-900 text-white min-h-screen">
            <Navbar/>
            <main>{children}</main>
        </div>
    )
}
