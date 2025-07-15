import NextAuth, { NextAuthConfig } from "next-auth";
import { prisma } from "@/db/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcrypt-ts-edge";
import { Role } from "@/lib/generated/prisma";

export const config: NextAuthConfig = {
  pages: {
    signIn: "/sign-in", // Redirect to /sign-in for login
    error: "/sign-in",
  },
  session: {
    strategy: "jwt", // Use JSON Web Tokens for session management
    maxAge: 30 * 24 * 60 * 60, // Set session to expire in 30 days
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null; // Invalid credentials format
        }

        // Find the user in the database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        // Deny access if the user is a DOCTOR or doesn't exist
        if (!user || user.role === Role.DOCTOR) {
          return null;
        }

        if (user && user.password) {
          // Verify the password
          const passwordsMatch = compareSync(
            credentials.password as string,
            user.password
          );

          if (passwordsMatch) {
            // On successful authentication, return user details
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              image: user.image,
            };
          }
        }

        // If password does not match, return null
        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks, // Import the authorized callback

    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, populate the token with user data
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        return token;
      }

      // On subsequent requests, refresh token data if needed
      if (trigger === "update" && session?.user) {
        // const existingUser = await prisma.user.findUnique({
        //   where: { id: token.sub },
        // });

        // If user not found, something is wrong
        // if (!existingUser) return null;

        // Keep token data fresh
        // token.role = existingUser.role;
        // token.name = existingUser.name;
        // token.email = existingUser.email;
        // token.picture = existingUser.image;
        if (session.user.image) {
          token.picture = session.user.image;
        }
        if (session.user.name) {
          token.name = session.user.name;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Map token data to the client-side session object
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.role) {
        session.user.role = token.role as Role;
      }
      session.user.name = token.name;
      session.user.email = token.email as string;
      session.user.image = token.picture;

      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
