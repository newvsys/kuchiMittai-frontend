import { Account, User as AuthUser } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
// import prisma from "@/utils/db";
import { nanoid } from "nanoid";

export const authOptions = {
  // Configure one or more authentication providers
  
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        loginstatus: { label: "Login Status", type: "text" },
        id: { label: "User ID", type: "text" },
        role: { label: "User Role", type: "text" },

      },
      async authorize(credentials: any) {
        // Log request details
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
        const loginUrl = `${baseUrl}/api/user/login`;
        console.log("API Request to:", loginUrl);
  console.log("Request payload:", {
    email: credentials.email,
    password: credentials.password,
     role: credentials.role,
    id: credentials.id,
    loginstatus: credentials.loginstatus

  });

    
        if (credentials.loginstatus === "success") {
          return {
            id: credentials.id,
            email: credentials.email,
            role: credentials.role,
          };
        }

        return null;
      },
    }),
    
  ],
  callbacks: {
  
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.iat = Math.floor(Date.now() / 1000); // Issued at time
      }
      
      // Check if token is expired (15 minutes)
      const now = Math.floor(Date.now() / 1000);
      const tokenAge = now - (token.iat as number);
      const maxAge = 15 * 60; // 15 minutes
      
      if (tokenAge > maxAge) {
        // Token expired, return empty object to force re-authentication
        return {};
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect to login page on auth errors
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 15 * 60, // 15 minutes in seconds
    updateAge: 5 * 60, // Update session every 5 minutes
  },
  jwt: {
    maxAge: 15 * 60, // 15 minutes in seconds
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
