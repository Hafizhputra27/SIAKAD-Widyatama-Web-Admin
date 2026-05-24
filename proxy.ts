import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;
  const legacyCookie = request.cookies.get("siakad-auth")?.value;
  const isAuthenticated = !!sessionCookie || legacyCookie === "authenticated";

  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const isPublicRoute = pathname === "/login";

  // API routes
  const isApiRoute = pathname.startsWith("/api");

  // All other pages are protected
  const isProtectedRoute = !isPublicRoute && !isApiRoute;

  // Redirect unauthenticated requests to login
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated requests trying to access login to home
  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect legacy /dashboard path to root /
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
