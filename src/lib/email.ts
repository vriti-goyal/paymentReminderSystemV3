import nodemailer from "nodemailer";

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface EmailParams {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amountDue: string;
  dueDate: string;
  businessName: string;
  invoiceStatus?: string;
}

// Reusable styling for all emails
const baseStyles = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #374151;
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
`;

const cardStyles = `
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
`;

const getStatusBadge = (status: string) => {
  let bg = "#fef3c7";
  let color = "#b45309";
  
  if (status === "PAID") {
    bg = "#d1fae5";
    color = "#047857";
  } else if (status === "OVERDUE") {
    bg = "#ffe4e6";
    color = "#e11d48";
  }
  
  return `<span style="background: ${bg}; color: ${color}; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${status.replace("_", " ")}</span>`;
};

export async function sendPaymentReminderEmail(params: EmailParams & { daysBeforeDue?: number, isOverdue?: boolean, reminderMessage?: string }) {
  try {
    const { to, customerName, invoiceNumber, amountDue, dueDate, businessName, invoiceStatus = "PENDING", isOverdue, daysBeforeDue, reminderMessage } = params;

    let subject = `Payment Reminder: Invoice ${invoiceNumber}`;
    let headingTitle = "Payment Reminder";
    
    if (isOverdue) {
      subject = `[OVERDUE] Payment Required: Invoice ${invoiceNumber}`;
      headingTitle = "Overdue Payment Notice";
    } else if (daysBeforeDue !== undefined) {
      subject = `Payment Reminder: Invoice ${invoiceNumber} due in ${daysBeforeDue} days`;
    }

    const html = `
      <div style="background-color: #f9fafb; padding: 40px 0; width: 100%;">
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.025em;">${businessName}</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 8px; font-weight: 500;">${headingTitle}</p>
            </div>
            
            <p style="font-size: 16px; color: #374151;">Hi <strong>${customerName}</strong>,</p>
            
            <p style="font-size: 15px; color: #4b5563; margin-bottom: 24px;">
              ${reminderMessage || `This is a friendly reminder that payment for invoice <strong>${invoiceNumber}</strong> is ${isOverdue ? "currently overdue" : "due soon"}.`}
            </p>

            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px;">
                <span style="color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Invoice Status</span>
                ${getStatusBadge(invoiceStatus)}
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Invoice Number</td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Due Date</td>
                  <td style="padding: 8px 0; color: ${isOverdue ? '#e11d48' : '#0f172a'}; font-size: 14px; font-weight: 700; text-align: right;">${dueDate}</td>
                </tr>
                <tr>
                  <td style="padding: 16px 0 8px 0; color: #64748b; font-size: 14px; font-weight: 700;">Amount Due</td>
                  <td style="padding: 16px 0 8px 0; color: #4f46e5; font-size: 20px; font-weight: 900; text-align: right;">${amountDue}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 32px;">
              Please arrange for payment at your earliest convenience. If you have already made the payment, please disregard this notice.
            </p>

            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="font-size: 13px; color: #9ca3af; font-weight: 500;">Regards,<br><strong style="color: #4b5563;">${businessName}</strong></p>
            </div>
          </div>
        </div>
      </div>
    `;

    const text = `
Dear ${customerName},

${reminderMessage || `This is a payment reminder for invoice ${invoiceNumber}.`}

Amount Due: ${amountDue}
Due Date: ${dueDate}
Status: ${invoiceStatus.replace("_", " ")}

Kindly complete the payment at your earliest convenience.

Regards,
${businessName}
    `.trim();

    const info = await transporter.sendMail({
      from: `"${businessName}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Nodemailer sendPaymentReminderEmail Error:", error);
    return { success: false, error };
  }
}

export async function sendInvoiceCreatedEmail(params: EmailParams) {
  try {
    const { to, customerName, invoiceNumber, amountDue, dueDate, businessName } = params;

    const subject = `New Invoice: ${invoiceNumber} from ${businessName}`;

    const html = `
      <div style="background-color: #f9fafb; padding: 40px 0; width: 100%;">
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.025em;">${businessName}</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 8px; font-weight: 500;">New Invoice Issued</p>
            </div>
            
            <p style="font-size: 16px; color: #374151;">Hi <strong>${customerName}</strong>,</p>
            
            <p style="font-size: 15px; color: #4b5563; margin-bottom: 24px;">
              A new invoice <strong>${invoiceNumber}</strong> has been generated for you by ${businessName}.
            </p>

            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Invoice Number</td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Due Date</td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${dueDate}</td>
                </tr>
                <tr>
                  <td style="padding: 16px 0 8px 0; color: #64748b; font-size: 14px; font-weight: 700;">Total Amount</td>
                  <td style="padding: 16px 0 8px 0; color: #4f46e5; font-size: 20px; font-weight: 900; text-align: right;">${amountDue}</td>
                </tr>
              </table>
            </div>

            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="font-size: 13px; color: #9ca3af; font-weight: 500;">Regards,<br><strong style="color: #4b5563;">${businessName}</strong></p>
            </div>
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${businessName}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Nodemailer sendInvoiceCreatedEmail Error:", error);
    return { success: false, error };
  }
}

export async function sendPaymentReceivedEmail(params: EmailParams & { amountPaid: string }) {
  try {
    const { to, customerName, invoiceNumber, amountDue, businessName, amountPaid } = params;

    const subject = `Payment Received: Invoice ${invoiceNumber}`;

    const html = `
      <div style="background-color: #f9fafb; padding: 40px 0; width: 100%;">
        <div style="${baseStyles}">
          <div style="${cardStyles}">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="background: #10b981; color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-size: 24px;">✓</div>
              <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.025em;">Payment Received</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 8px; font-weight: 500;">Thank you for your business</p>
            </div>
            
            <p style="font-size: 16px; color: #374151;">Hi <strong>${customerName}</strong>,</p>
            
            <p style="font-size: 15px; color: #4b5563; margin-bottom: 24px;">
              We have successfully received your payment of <strong>${amountPaid}</strong> for invoice <strong>${invoiceNumber}</strong>.
            </p>

            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Invoice Number</td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Amount Paid</td>
                  <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 700; text-align: right;">${amountPaid}</td>
                </tr>
                <tr>
                  <td style="padding: 16px 0 8px 0; color: #64748b; font-size: 14px; font-weight: 700; border-top: 1px solid #e2e8f0;">Remaining Balance</td>
                  <td style="padding: 16px 0 8px 0; color: #4f46e5; font-size: 16px; font-weight: 900; text-align: right; border-top: 1px solid #e2e8f0;">${amountDue}</td>
                </tr>
              </table>
            </div>

            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="font-size: 13px; color: #9ca3af; font-weight: 500;">Regards,<br><strong style="color: #4b5563;">${businessName}</strong></p>
            </div>
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${businessName}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Nodemailer sendPaymentReceivedEmail Error:", error);
    return { success: false, error };
  }
}
