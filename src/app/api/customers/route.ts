import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const customers = await prisma.customer.findMany({
      where: {
        userId: session.user.id,
        OR: search
          ? [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                phone: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                companyName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ]
          : undefined,
      },
      include: {
        invoices: {
          select: {
            balanceAmount: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const customersWithDue = customers.map((c: any) => {
      const totalDue = c.invoices.reduce((sum: number, inv: any) => {
        if (inv.status !== "PAID" && inv.status !== "CANCELLED") {
          return sum + Number(inv.balanceAmount);
        }
        return sum;
      }, 0);

      const { invoices, ...customerData } = c;
      return {
        ...customerData,
        totalDueAmount: totalDue,
      };
    });

    return NextResponse.json(customersWithDue);
  } catch (error) {
    console.error("CUSTOMERS_GET_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { name, email, phone, address, companyName, image } = body;

    if (!name || !email) {
      return NextResponse.json(
        { message: "Customer name and email are required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        userId: session.user.id,
        name,
        email: email.toLowerCase(),
        phone,
        address,
        companyName,
        image: image || null,
      },
    });

    return NextResponse.json(
      {
        message: "Customer created successfully",
        customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CUSTOMERS_POST_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}