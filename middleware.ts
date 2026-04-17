import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/partner", // Portal Pendaftaran Vendor Baru
  "/vendor/register",
  "/vendor/status",
  "/vendor/revise",
  "/vendor/my",
  "/api/auth/login",
  "/api/vendor-intake",
  "/api/vendor-status",
  "/api/vendor-revision",
  "/api/vendor-identity",
  "/_next",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host');
  
  // 1. Dukungan Khusus Domain partner.juaraevent.id
  // Mengarahkan domain partner langsung ke portal pendaftaran
  const partnerDomain = 'partner.juaraevent.id';
  if (hostname === partnerDomain) {
    if (pathname === '/' || pathname === '/login') {
      return NextResponse.rewrite(new URL('/partner', request.url));
    }
  }

  // 2. Cek apakah path bersifat Publik
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isPublic) {
    return NextResponse.next();
  }

  // 3. Cek Autentikasi Admin untuk Dashboard Internal (CRM, Projects, Vendors)
  const authenticated = request.cookies.get(ADMIN_SESSION_COOKIE)?.value === "active";
  if (authenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
