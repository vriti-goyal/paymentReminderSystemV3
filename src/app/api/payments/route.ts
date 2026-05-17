import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function calculateInvoiceStatus(
  amount: number,
  paidAmount: number,
  dueDate: Date
) {
  const today = new Date();

  if (paidAmount >= amount) {
    return "PAID";
  }

  if (paidAmount > 0 && paidAmount < amount) {
    return "PARTIALLY_PAID";
  }

  if (dueDate < today) {
    return "OVERDUE";
  }

  return "PENDING";
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

    const { invoiceId, amountPaid, paymentMode, remarks } = body;

    if (!invoiceId || !amountPaid || !paymentMode) {
      return NextResponse.json(
        { message: "Invoice, amount paid, and payment mode are required" },
        { status: 400 }
      );
    }

    const paymentAmount = Number(amountPaid);

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { message: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: session.user.id,
      },
      include: {
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404 }
      );
    }

    const invoiceAmount = Number(invoice.amount);
    const currentPaidAmount = Number(invoice.paidAmount);
    const newPaidAmount = currentPaidAmount + paymentAmount;

    if (newPaidAmount > invoiceAmount) {
      return NextResponse.json(
        { message: "Payment amount cannot be greater than balance amount" },
        { status: 400 }
      );
    }

    const newBalanceAmount = invoiceAmount - newPaidAmount;

    const newStatus = calculateInvoiceStatus(
      invoiceAmount,
      newPaidAmount,
      invoice.dueDate
    );

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: session.user.id,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          amountPaid: new Prisma.Decimal(paymentAmount),
          paymentMode: paymentMode,
          remarks,
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          paidAmount: new Prisma.Decimal(newPaidAmount),
          balanceAmount: new Prisma.Decimal(newBalanceAmount),
          status: newStatus,
        },
        include: {
          customer: true,
          payments: true,
        },
      });

      return {
        payment,
        invoice: updatedInvoice,
      };
    });

    return NextResponse.json(
      {
        message: "Payment added successfully",
        result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PAYMENT_POST_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}