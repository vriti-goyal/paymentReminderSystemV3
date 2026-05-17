import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        image: true,
        emailPass: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const responseUser = {
      ...user,
      emailPass: user.emailPass ? "••••••••••••" : null,
    };

    return NextResponse.json(responseUser);
  } catch (error) {
    console.error("PROFILE_GET_ERROR", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, businessName, image, emailPass } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { message: "Name is required" },
        { status: 400 }
      );
    }

    let updatedEmailPass: string | undefined = undefined;

    if (emailPass === "••••••••••••") {
      // Unchanged, do nothing
      updatedEmailPass = undefined;
    } else if (!emailPass || emailPass.trim() === "") {
      return NextResponse.json(
        { message: "Gmail App Password is required" },
        { status: 400 }
      );
    } else {
      // New password entered, encrypt it
      updatedEmailPass = encrypt(emailPass.trim());
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        name: name.trim(),
        businessName: businessName ? businessName.trim() : null,
        image: image || null,
        ...(updatedEmailPass !== undefined ? { emailPass: updatedEmailPass } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        image: true,
        emailPass: true,
      },
    });

    const responseUser = {
      ...updatedUser,
      emailPass: updatedUser.emailPass ? "••••••••••••" : null,
    };

    return NextResponse.json({
      message: "Profile updated successfully",
      user: responseUser,
    });
  } catch (error) {
    console.error("PROFILE_PUT_ERROR", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
