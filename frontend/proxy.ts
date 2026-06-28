import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
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

    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Proxy auth check failed:", error);
    return NextResponse.redirect(new URL('/auth', request.url));
  }
}

export const config = {
  // you probably wanna uncomment this
  // matcher: ['/chat/:path*', '/chat', '/profile'],
};
