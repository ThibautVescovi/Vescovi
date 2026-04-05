'use client'

import { Auth } from '@supabase/auth-ui-react'
import { supabaseClient } from '@/lib/supabaseClient'
import {ThemeSupa} from "@supabase/auth-ui-shared";

export default function AuthForm() {
    return (
        <Auth
            supabaseClient={supabaseClient}
            providers={[]}
            appearance={{ theme: ThemeSupa }}
        />
    )
}