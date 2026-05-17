import { NextResponse } from "next/server";
import { InvoiceStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function POST() {
  try {
    const today = startOfToday();

    const result = await prisma.invoice.updateMany({
      where: {
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

    return NextResponse.json({
      message: "Overdue invoices updated successfully",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("UPDATE_OVERDUE_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong while updating overdue invoices" },
      { status: 500 }
    );
  }
}