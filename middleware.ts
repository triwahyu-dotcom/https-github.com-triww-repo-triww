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
  "/api/vendor-intake-v2",
  "/api/vendor-status",
  "/api/vendor-revision",
  "/api/vendor-identity",
  "/docs",
  "/_next",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host');
  
  // 1. Konfigurasi Domain
  const partnerDomain = 'partner.juaraevent.id';
  const workspaceDomain = 'workspace.juaraevent.id';
  
  // 2. Cek Autentikasi Admin
  const authenticated = request.cookies.get(ADMIN_SESSION_COOKIE)?.value === "active";

  // 3. LOGIKA DOMAIN PARTNER (Khusus Vendor)
  if (hostname === partnerDomain) {
    // Arahkan root domain partner langsung ke portal pendaftaran
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/partner/v2', request.url));
    }

    // Jika vendor mencoba akses login atau dashboard internal di domain partner
    const isPublic = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
    
    if (!isPublic) {
      // Tendang balik ke root (yang akan di-rewrite ke /partner)
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Path publik lainnya (register, status, dll) diperbolehkan
    return NextResponse.next();
  }

  // 4. LOGIKA DOMAIN WORKSPACE (Khusus Tim Internal)
  if (hostname === workspaceDomain || hostname?.includes('localhost') || hostname?.includes('vercel.app')) {
    const isPublic = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));

    // Jika mengakses halaman publik atau API, perbolehkan
    if (isPublic) {
      return NextResponse.next();
    }

    // Jika sudah login, bebaskan akses
    if (authenticated) {
      return NextResponse.next();
    }

    // Jika belum login, paksa ke halaman login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fallback untuk domain lain
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
