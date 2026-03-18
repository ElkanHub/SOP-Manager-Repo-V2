import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export default async function proxy(request: NextRequest) {

    console.log('>>> proxy hit:', request.nextUrl.pathname)


    const { supabase, supabaseResponse } = await updateSession(request)

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup') ||
        request.nextUrl.pathname.startsWith('/setup')

    const url = request.nextUrl.clone()
    let redirectUrl: URL | null = null

    if (request.nextUrl.pathname.startsWith('/setup')) {
        const { data: hasAdmin } = await supabase.rpc('has_any_admin')
        if (hasAdmin) {
            url.pathname = '/login'
            redirectUrl = url
        }
    } else if (!user && !isAuthRoute) {
        url.pathname = '/login'
        redirectUrl = url
    } else if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_active, onboarding_complete')
            .eq('id', user.id)
            .single()

        console.log('>>> proxy profile check:', { id: user.id, active: profile?.is_active, onboarding: profile?.onboarding_complete })

        if (profile) {
            if (!profile.is_active && !isAuthRoute) {
                console.log('>>> proxy: deactivating user redirect to login')
                url.pathname = '/login'
                url.search = '?reason=inactive'
                redirectUrl = url
            } else if (profile.is_active && !profile.onboarding_complete && request.nextUrl.pathname !== '/onboarding' && !isAuthRoute) {
                console.log('>>> proxy: onboarding incomplete redirect')
                url.pathname = '/onboarding'
                redirectUrl = url
            } else if (profile.is_active && profile.onboarding_complete && (isAuthRoute || request.nextUrl.pathname === '/onboarding' || request.nextUrl.pathname === '/')) {
                console.log('>>> proxy: active user redirect to dashboard from', request.nextUrl.pathname)
                url.pathname = '/dashboard'
                redirectUrl = url
            }
        } else {
            console.log('>>> proxy: NO PROFILE FOUND for user', user.id)
        }
    }

    if (redirectUrl) {
        // We MUST preserve the cookies set by updateSession by copying them into the redirect response
        const redirectResponse = NextResponse.redirect(redirectUrl)
        supabaseResponse.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                redirectResponse.headers.append(key, value)
            }
        })
        return redirectResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
