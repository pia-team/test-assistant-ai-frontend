import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // TODO: Re-implement server-side protection if needed (e.g. verifying JWT token from cookie if using that flow)
    // For now, allow client-side to handle auth states.

    // Valid application routes (optional: keep this check if desired for 404s, but simplified)
    // const validRoutes = ["/", "/activities", "/login", "/generate-tests", "/upload-json", "/test-run", "/auth/error", "/auth/signout"];
    // ...

    // Handle Root URL redirect
    if (pathname === "/") {
        return NextResponse.redirect(new URL("/overview", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
