import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const session = await auth();
    const { pathname } = request.nextUrl;

    // Public routes (no auth required)
    const publicRoutes = ["/login", "/api/auth"];
    const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // Valid application routes
    const validRoutes = ["/", "/home", "/login", "/generate-tests", "/upload-json", "/test-run", "/auth/error", "/auth/signout"];
    const isValidRoute = validRoutes.some((route) =>
        pathname === route || pathname.startsWith(route + "/")
    );

    // If route doesn't exist (and is not a public route like /api/auth)
    if (!isValidRoute && !isPublicRoute) {
        if (session) {
            // Authenticated user with invalid route → redirect to home
            return NextResponse.redirect(new URL("/home", request.url));
        } else {
            // Unauthenticated user with invalid route → redirect to login
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // Handle Root URL
    if (pathname === "/") {
        if (session) {
            return NextResponse.redirect(new URL("/home", request.url));
        } else {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // If not authenticated and trying to access protected route
    if (!session && !isPublicRoute) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If authenticated and trying to access login page
    if (session && pathname === "/login") {
        return NextResponse.redirect(new URL("/home", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
