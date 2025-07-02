import NextAuth, { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const protectedPaths = ["/admin", "/user", "/appointments"];

// Function to check if a given path is protected
const isProtectedPath = (path: string) => {
  return protectedPaths.some((protectedPath) => path.startsWith(protectedPath));
};

export const authConfig: NextAuthConfig = {
  providers: [], // Providers are defined in the main auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user; //true or false
      const isTryingToAccessProtectedPath = isProtectedPath(nextUrl.pathname);

      if (!isLoggedIn && isTryingToAccessProtectedPath) {
        // Build the redirect URL with a callback
        const callbackUrl = nextUrl.pathname + nextUrl.search;
        const redirectUrl = new URL("/sign-in", nextUrl.origin);
        redirectUrl.searchParams.set("callbackUrl", encodeURI(callbackUrl));

        return NextResponse.redirect(redirectUrl);
      }

      // If logged in or the path is not protected, allow access
      return true;
    },
  },
};
