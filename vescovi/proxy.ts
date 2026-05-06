// proxy.ts
import {createServerClient} from '@supabase/ssr'
import {NextResponse, type NextRequest} from 'next/server'

export async function proxy(req: NextRequest) {
    const res = NextResponse.next()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) {
                    return req.cookies.get(name)?.value
                },
                set(name, value, options) {
                    res.cookies.set(name, value, options)
                },
                remove(name, options) {
                    res.cookies.set(name, '', options)
                },
            },
        }
    )

    const {
        data: {user},
    } = await supabase.auth.getUser()

    const isAuthPage = req.nextUrl.pathname.startsWith('/login')

    if (!user && !isAuthPage) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    if (user && isAuthPage) {
        return NextResponse.redirect(new URL('/', req.url))
    }

    return res
}

export const config = {
    matcher: ['/', '/home', '/profile', '/team', '/view-team', '/ranking', '/admin/points', '/login'],
}
