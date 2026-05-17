import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, email, password, emailPass, businessName } = body;

    if (!name || !email || !password || !emailPass) {
      return NextResponse.json(
        { message: "Name, email, password, and Email App Password are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const encryptedEmailPass = encrypt(emailPass.trim());

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailPass: encryptedEmailPass,
        businessName: businessName ? businessName.trim() : null,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong while creating account" },
      { status: 500 }
    );
  }
}