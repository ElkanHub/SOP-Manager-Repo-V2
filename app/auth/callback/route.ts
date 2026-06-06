import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const code = searchParams.get('code')
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || (host?.includes('localhost') ? 'http' : 'https')
  const origin = host
    ? `${protocol}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin

  console.log('>>> auth/callback hit:', { code: !!code, next, origin })

  if (providerError) {
    console.error('>>> auth/callback: provider error:', providerError)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(providerError)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
        console.log('>>> auth/callback: session exchange success, redirecting to', next)
        return NextResponse.redirect(`${origin}${next}`)
    } else {
        console.error('>>> auth/callback: session exchange error:', error.message)
    }
  }

  console.log('>>> auth/callback: no code or error, redirecting to login')
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Could not authenticate user')}`)
}
