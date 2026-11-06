import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Static resources and Next internals - always allow
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/google/auth") ||
    pathname.startsWith("/api/google/callback") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/icon.svg"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("montlife_session")?.value;

  // 2. Unauthenticated access
  if (!sessionCookie) {
    // If accessing an internal API route without a session, return 401 immediately
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Por favor, autentique-se." },
        { status: 401 }
      );
    }

    // If already on /login, allow rendering the login page
    if (pathname === "/login") {
      return NextResponse.next();
    }

    // Redirect unauthenticated user to /login
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/" || search) {
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Authenticated user visiting /login - redirect to main dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icon.svg).*)",
  ],
};

