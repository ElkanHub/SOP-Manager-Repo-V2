import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export default async function proxy(request: NextRequest) {

    console.log('>>> proxy hit:', request.nextUrl.pathname)

    // ─── Public routes: skip ALL auth logic ─────────────────────────────
    // /m/[token] is the anonymous mobile signing page.
    // /e/[id] is the public equipment QR-landing page (scannable from printed tags).
    // Both must be accessible without any Supabase session.
    if (request.nextUrl.pathname.startsWith('/m/') || request.nextUrl.pathname.startsWith('/e/')) {
        return NextResponse.next()
    }

    const { supabase, supabaseResponse } = await updateSession(request)

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup') ||
        request.nextUrl.pathname.startsWith('/setup') ||
        request.nextUrl.pathname.startsWith('/forgot-password') ||
        request.nextUrl.pathname.startsWith('/reset-password') ||
        request.nextUrl.pathname.startsWith('/auth')

    console.log('>>> proxy auth check:', { pathname: request.nextUrl.pathname, isAuthRoute })

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
            .select('is_active, onboarding_complete, signup_status')
            .eq('id', user.id)
            .single()

        console.log('>>> proxy profile check:', { id: user.id, active: profile?.is_active, onboarding: profile?.onboarding_complete })

        if (profile) {
            const isRestrictedAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                                         request.nextUrl.pathname.startsWith('/signup') ||
                                         request.nextUrl.pathname.startsWith('/setup')

            if (!profile.is_active && !isAuthRoute) {
                console.log('>>> proxy: deactivating user redirect to login')
                url.pathname = '/login'
                url.search = '?reason=inactive'
                redirectUrl = url
            } else if (profile.is_active && profile.signup_status === 'pending' && request.nextUrl.pathname !== '/waiting-room' && !isAuthRoute) {
                console.log('>>> proxy: pending signup redirect to waiting room')
                url.pathname = '/waiting-room'
                redirectUrl = url
            } else if (profile.is_active && profile.signup_status === 'approved' && !profile.onboarding_complete && request.nextUrl.pathname !== '/onboarding' && !isAuthRoute) {
                console.log('>>> proxy: onboarding incomplete redirect')
                url.pathname = '/onboarding'
                redirectUrl = url
            } else if (profile.is_active && profile.signup_status === 'approved' && profile.onboarding_complete && (isRestrictedAuthRoute || request.nextUrl.pathname === '/onboarding' || request.nextUrl.pathname === '/waiting-room' || request.nextUrl.pathname === '/')) {
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
