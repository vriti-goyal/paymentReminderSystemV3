import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      businessName?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    businessName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    businessName?: string | null;
  }
}