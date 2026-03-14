import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
    const { supabase, supabaseResponse } = await updateSession(request)

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup') ||
        request.nextUrl.pathname.startsWith('/setup')

    const url = request.nextUrl.clone()

    if (request.nextUrl.pathname.startsWith('/setup')) {
        const { data: hasAdmin } = await supabase.rpc('has_any_admin')
        if (hasAdmin) {
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    if (!user && !isAuthRoute && request.nextUrl.pathname !== '/') {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_active, onboarding_complete')
            .eq('id', user.id)
            .single()

        if (profile) {
            if (!profile.is_active && !isAuthRoute) {
                url.pathname = '/login'
                url.search = '?reason=inactive'
                return NextResponse.redirect(url)
            }

            if (profile.is_active && !profile.onboarding_complete && request.nextUrl.pathname !== '/onboarding' && !isAuthRoute) {
                url.pathname = '/onboarding'
                return NextResponse.redirect(url)
            }

            if (profile.is_active && profile.onboarding_complete && (isAuthRoute || request.nextUrl.pathname === '/onboarding')) {
                url.pathname = '/dashboard'
                return NextResponse.redirect(url)
            }
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
