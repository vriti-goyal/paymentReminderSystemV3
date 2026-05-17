import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, InvoiceStatus } from "@/generated/prisma";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function calculateStatus(amount: number, paidAmount: number, dueDate: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoiceDueDate = new Date(dueDate);
  invoiceDueDate.setHours(0, 0, 0, 0);

  if (paidAmount >= amount) {
    return InvoiceStatus.PAID;
  }

  if (invoiceDueDate < today) {
    return InvoiceStatus.OVERDUE;
  }

  if (paidAmount > 0 && paidAmount < amount) {
    return InvoiceStatus.PARTIALLY_PAID;
  }

  return InvoiceStatus.PENDING;
}

function generateInvoiceNumber() {
  const timestamp = Date.now();
  return `INV-${timestamp}`;
}

async function updateOverdueInvoices(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.invoice.updateMany({
    where: {
      userId,
      dueDate: {
        lt: today,
      },
      status: {
        in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID],
      },
    },
    data: {
      status: InvoiceStatus.OVERDUE,
    },
  });
}

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
    const status = searchParams.get("status") || "";
    const customerId = searchParams.get("customerId") || "";
    const due = searchParams.get("due") || "";

    await updateOverdueInvoices(session.user.id);

    let dueDateFilter = undefined;
    if (due === "this_week") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(today);
      const currentDay = today.getDay(); // 0 is Sunday
      startOfWeek.setDate(today.getDate() - currentDay);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      dueDateFilter = {
        gte: startOfWeek,
        lte: endOfWeek,
      };
    } else if (due === "this_month") {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      dueDateFilter = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        customerId: customerId ? customerId : undefined,

        status: status ? (status as InvoiceStatus) : undefined,
        dueDate: dueDateFilter,

        OR: search
          ? [
              {
                invoiceNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                customer: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                customer: {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ]
          : undefined,
      },
      include: {
        customer: true,
        payments: true,
        reminders: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("INVOICES_GET_ERROR", error);

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

    const { customerId, amount, dueDate, description, notes } = body;

    if (!customerId || !amount || !dueDate) {
      return NextResponse.json(
        { message: "Customer, amount, and due date are required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId: session.user.id,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    const invoiceAmount = Number(amount);

    if (invoiceAmount <= 0) {
      return NextResponse.json(
        { message: "Invoice amount must be greater than 0" },
        { status: 400 }
      );
    }

    const paidAmount = 0;
    const invoiceDueDate = new Date(dueDate);

    const invoice = await prisma.invoice.create({
      data: {
        userId: session.user.id,
        customerId,
        invoiceNumber: generateInvoiceNumber(),
        amount: new Prisma.Decimal(invoiceAmount),
        paidAmount: new Prisma.Decimal(paidAmount),
        balanceAmount: new Prisma.Decimal(invoiceAmount - paidAmount),
        dueDate: invoiceDueDate,
        status: calculateStatus(invoiceAmount, paidAmount, invoiceDueDate),
        description,
        notes,
      },
      include: {
        customer: true,
        payments: true,
        reminders: true,
      },
    });

    return NextResponse.json(
      {
        message: "Invoice created successfully",
        invoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("INVOICES_POST_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}