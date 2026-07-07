import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  console.log(`[Proxy Middleware] Path: ${request.nextUrl.pathname}, token status: ${token ? 'exists' : 'missing'}`);

  if (!token) {
    console.log(`[Proxy Middleware] Redirecting to /auth because token is missing`);
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error(`[Proxy Middleware] Supabase client error:`, error);
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    if (!user) {
      console.log(`[Proxy Middleware] Redirecting to /auth because getUser returned no user`);
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    console.log(`[Proxy Middleware] Authorized successfully for user ID: ${user.id}`);
    return NextResponse.next();
  } catch (error) {
    console.error("[Proxy Middleware] Exception in proxy auth check:", error);
    return NextResponse.redirect(new URL('/auth', request.url));
  }
}

export const config = {
  matcher: ['/chat/:path*', '/chat', '/profile'],
};
