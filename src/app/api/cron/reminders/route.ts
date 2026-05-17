import { NextResponse } from "next/server";
import { ReminderStatus, ReminderType } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatCurrency(value: unknown) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN");
}

async function sendAutomaticReminder(invoice: any, daysBeforeDue: number) {
  const subject = `Payment Reminder: Invoice ${invoice.invoiceNumber} due in ${daysBeforeDue} days`;

  const message = `Dear ${invoice.customer.name},

This is an automatic payment reminder.

Invoice Number: ${invoice.invoiceNumber}
Amount Due: ${formatCurrency(invoice.balanceAmount)}
Due Date: ${formatDate(invoice.dueDate)}

Your payment is due in ${daysBeforeDue} days.

Regards,
${invoice.user.businessName || invoice.user.name || "Your Business"}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Payment Reminder</h2>

      <p>Dear ${invoice.customer.name},</p>

      <p>
        This is an automatic payment reminder for invoice
        <strong>${invoice.invoiceNumber}</strong>.
      </p>

      <table style="border-collapse: collapse; margin-top: 16px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <strong>Invoice Number</strong>
          </td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            ${invoice.invoiceNumber}
          </td>
        </tr>

        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <strong>Amount Due</strong>
          </td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            ${formatCurrency(invoice.balanceAmount)}
          </td>
        </tr>

        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <strong>Due Date</strong>
          </td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            ${formatDate(invoice.dueDate)}
          </td>
        </tr>

        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <strong>Reminder</strong>
          </td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            Payment due in ${daysBeforeDue} days
          </td>
        </tr>
      </table>

      <p style="margin-top: 16px;">
        Kindly complete the payment on or before the due date.
      </p>

      <p>
        Regards,<br/>
        ${invoice.user.businessName || invoice.user.name || "Your Business"}
      </p>
    </div>
  `;

  const reminder = await prisma.reminder.create({
    data: {
      userId: invoice.userId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      reminderType: ReminderType.BEFORE_DUE_DATE,
      status: ReminderStatus.PENDING,
      subject,
      message,
      sentTo: invoice.customer.email,
    },
  });

  try {
    const emailResponse = await resend.emails.send({
      from:
        process.env.EMAIL_FROM ||
        "Payment Reminder <onboarding@resend.dev>",
      to: invoice.customer.email,
      subject,
      html,
    });

    if (emailResponse.error) {
      throw new Error(emailResponse.error.message);
    }

    await prisma.reminder.update({
      where: {
        id: reminder.id,
      },
      data: {
        status: ReminderStatus.SENT,
        resendEmailId: emailResponse.data?.id,
        sentAt: new Date(),
      },
    });

    return {
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer.email,
      daysBeforeDue,
      status: "SENT",
    };
  } catch (error) {
    console.error("AUTO_REMINDER_EMAIL_ERROR", error);

    await prisma.reminder.update({
      where: {
        id: reminder.id,
      },
      data: {
        status: ReminderStatus.FAILED,
      },
    });

    return {
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer.email,
      daysBeforeDue,
      status: "FAILED",
    };
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { message: "Unauthorized cron request" },
        { status: 401 }
      );
    }

    const today = startOfDay(new Date());

    /**
     * Step 1:
     * Automatically mark old unpaid invoices as OVERDUE.
     */
    const overdueUpdateResult = await prisma.invoice.updateMany({
      where: {
        dueDate: {
          lt: today,
        },
        status: {
          in: ["PENDING", "PARTIALLY_PAID"],
        },
      },
      data: {
        status: "OVERDUE",
      },
    });

    /**
     * Step 2:
     * Send automatic reminders before due date.
     */
    const reminderDays = [15, 7, 2];

    const results = [];

    for (const daysBeforeDue of reminderDays) {
      const targetDate = addDays(today, daysBeforeDue);

      const invoices = await prisma.invoice.findMany({
        where: {
          status: {
            in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"],
          },
          dueDate: {
            gte: startOfDay(targetDate),
            lte: endOfDay(targetDate),
          },
          customer: {
            email: {
              not: "",
            },
          },
        },
        include: {
          customer: true,
          user: true,
          reminders: true,
        },
      });

      for (const invoice of invoices) {
        /**
         * Duplicate protection:
         * Do not send the same 15-day, 7-day, or 2-day reminder twice.
         */
        const alreadySent = await prisma.reminder.findFirst({
          where: {
            invoiceId: invoice.id,
            reminderType: ReminderType.BEFORE_DUE_DATE,
            status: ReminderStatus.SENT,
            subject: {
              contains: `due in ${daysBeforeDue} days`,
            },
          },
        });

        if (alreadySent) {
          results.push({
            invoiceNumber: invoice.invoiceNumber,
            customer: invoice.customer.email,
            daysBeforeDue,
            status: "SKIPPED_ALREADY_SENT",
          });

          continue;
        }

        const result = await sendAutomaticReminder(invoice, daysBeforeDue);
        results.push(result);
      }
    }

    return NextResponse.json({
      message: "Automatic reminder and overdue update job completed",
      overdueInvoicesUpdated: overdueUpdateResult.count,
      checkedReminderDays: reminderDays,
      totalActions: results.length,
      results,
    });
  } catch (error) {
    console.error("CRON_REMINDER_ERROR", error);

    return NextResponse.json(
      { message: "Cron reminder failed" },
      { status: 500 }
    );
  }
}