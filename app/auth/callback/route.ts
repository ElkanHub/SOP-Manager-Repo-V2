import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  // Robust origin detection
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const origin = `${protocol}://${host}`

  console.log('>>> auth/callback hit:', { code: !!code, next, origin })

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
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
