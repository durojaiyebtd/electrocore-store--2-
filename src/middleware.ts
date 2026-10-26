/**
 * First line of defence for the admin portal: anyone without an admin session
 * is blocked before any admin page renders: signed-in customers go to the home page,
 * everyone else to /login, both with an "Unauthorized Access" alert. Every admin API and
 * page also re-checks the role against the database (src/lib/admin-auth.ts).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './lib/session-token';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The sign-in pages themselves must stay reachable
  if (pathname === '/admin/login' || pathname === '/admin/forgot-password' || pathname === '/admin/reset-password') {
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
    // Signed-in customers are sent home; visitors who are not signed in are sent to the sign-in
    // page. Both get ?error=unauthorized, which shows the "Unauthorized Access" alert.
    if (session) {
      const homeUrl = new URL('/', request.url);
      homeUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(homeUrl);
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
