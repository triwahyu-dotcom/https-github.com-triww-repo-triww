import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host');

  // Define our dedicated partner domain
  const partnerDomain = 'partner.juaraevent.id';

  // 1. If user visits the dedicated partner domain
  if (hostname === partnerDomain) {
    // If they try to access the root OR internal routes that should be hidden
    // we rewrite them to our premium registration page
    if (url.pathname === '/' || url.pathname === '/login') {
      return NextResponse.rewrite(new URL('/partner', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
