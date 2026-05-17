import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";

function formatCurrency(value: unknown) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN");
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const reminders = await prisma.reminder.findMany({
      where: {
        userId: session.user.id,
        OR: search
          ? [
            {
              sentTo: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              subject: {
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
            {
              invoice: {
                invoiceNumber: {
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
        invoice: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("REMINDERS_GET_ERROR", error);

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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { message: "Invoice ID is required" },
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
        user: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status === "PAID") {
      return NextResponse.json(
        { message: "Cannot send reminder for a paid invoice" },
        { status: 400 }
      );
    }

    if (!invoice.customer.email) {
      return NextResponse.json(
        { message: "Customer email is missing" },
        { status: 400 }
      );
    }

    const subject = `Payment Reminder for Invoice ${invoice.invoiceNumber}`;

    const message = `Dear ${invoice.customer.name},

This is a payment reminder for invoice ${invoice.invoiceNumber}.

Amount Due: ${formatCurrency(invoice.balanceAmount)}
Due Date: ${formatDate(invoice.dueDate)}

Kindly complete the payment at the earliest.

Regards,
${invoice.user.businessName || invoice.user.name || "Your Business"}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Payment Reminder</h2>

        <p>Dear ${invoice.customer.name},</p>

        <p>This is a payment reminder for invoice <strong>${invoice.invoiceNumber}</strong>.</p>

        <table style="border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount Due</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(
      invoice.balanceAmount
    )}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(
      invoice.dueDate
    )}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${invoice.status.replace(
      "_",
      " "
    )}</td>
          </tr>
        </table>

        <p style="margin-top: 16px;">Kindly complete the payment at the earliest.</p>

        <p>Regards,<br/>
        ${invoice.user.businessName || invoice.user.name || "Your Business"}</p>
      </div>
    `;

    const reminder = await prisma.reminder.create({
      data: {
        userId: session.user.id,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        reminderType:
          invoice.status === "OVERDUE"
            ? "OVERDUE"
            : "BEFORE_DUE_DATE",
        status: "PENDING",
        subject,
        message,
        sentTo: invoice.customer.email,
      },
    });

    try {
      const emailResponse = await resend.emails.send({
        from: process.env.EMAIL_FROM || "Payment Reminder <onboarding@resend.dev>",
        to: invoice.customer.email,
        subject,
        html,
      });

      const updatedReminder = await prisma.reminder.update({
        where: {
          id: reminder.id,
        },
        data: {
          status: "SENT",
          resendEmailId: emailResponse.data?.id,
          sentAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          message: "Reminder email sent successfully",
          reminder: updatedReminder,
        },
        { status: 201 }
      );
    } catch (emailError) {
      console.error("RESEND_EMAIL_ERROR", emailError);

      const failedReminder = await prisma.reminder.update({
        where: {
          id: reminder.id,
        },
        data: {
          status: "FAILED",
        },
      });

      return NextResponse.json(
        {
          message: "Reminder saved but email sending failed",
          reminder: failedReminder,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("REMINDERS_POST_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}