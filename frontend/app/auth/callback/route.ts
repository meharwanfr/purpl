import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:3001'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/chat'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.session) {
      const token = data.session.access_token

      try {
        await fetch(`${BACKEND_API}/users/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      } catch {
        // Non-blocking: user sync will retry on chat page
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      // Robust redirect URL determination
      let baseUrl = origin
      if (!isLocalEnv) {
        if (SITE_URL) {
          // Ensure it has a protocol
          baseUrl = SITE_URL.startsWith('http') ? SITE_URL : `https://${SITE_URL}`
        } else if (forwardedHost) {
          baseUrl = `https://${forwardedHost}`
        }
      }

      const redirectUrl = `${baseUrl}${next}`
      const response = NextResponse.redirect(redirectUrl)

      response.cookies.set('auth_token', token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: false,
        sameSite: 'lax',
        secure: !isLocalEnv,
      })

      return response
    }
  }

  const isLocalEnv = process.env.NODE_ENV === 'development'
  const errorBaseUrl = (!isLocalEnv && SITE_URL)
    ? (SITE_URL.startsWith('http') ? SITE_URL : `https://${SITE_URL}`)
    : origin

  return NextResponse.redirect(`${errorBaseUrl}/auth?error=Could not authenticate user`)
}