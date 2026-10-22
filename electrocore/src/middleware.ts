/**
 * First line of defence for the admin portal: anyone without an admin session
 * is sent to /admin/login before any admin page renders. Every admin API and
 * page also re-checks the role against the database (src/lib/admin-auth.ts).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './lib/session-token';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The login page itself must stay reachable
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Machine-to-machine catalog sync authenticates with a Bearer token inside the route
  if (pathname === '/api/admin/sync' && request.headers.get('authorization')?.startsWith('Bearer ')) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isAdmin = session?.role === 'ADMIN';

  if (pathname.startsWith('/api/admin')) {
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: { message: 'Admin access required.', code: session ? 'FORBIDDEN' : 'UNAUTHENTICATED' } },
        { status: session ? 403 : 401 },
      );
    }
    return NextResponse.next();
  }

  if (!isAdmin) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
