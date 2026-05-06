import '../globals.css'
import Navbar from './navbar'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { isAdminRole } from '@/lib/authz'


export default async function AppLayout({children}: { children: React.ReactNode }) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    const canAccessAdmin = isAdminRole(profile?.role)

    return (
        <div className="bg-green-900 text-white min-h-screen">
            <Navbar canAccessAdmin={canAccessAdmin}/>
            <main>{children}</main>
        </div>
    )
}
