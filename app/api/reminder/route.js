import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { toEmail, toName, fromName, amount, senderEmail } = await req.json();

    if (!toEmail) {
      return NextResponse.json(
        { error: "Recipient email address is missing. The user may not have an email stored." },
        { status: 400 }
      );
    }
    if (!amount) {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY not configured" },
        { status: 500 }
      );
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Reminder</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">💸 Splitr</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Expense Splitting Made Easy</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 36px;">
              <p style="margin:0 0 8px;color:#374151;font-size:16px;">Hey <strong>${toName || "there"}</strong>,</p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
                This is a friendly reminder from <strong>${fromName || "your friend"}</strong> that you have an outstanding balance on Splitr.
              </p>

              <!-- Amount Box -->
              <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;color:#16a34a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Amount Due</p>
                <p style="margin:0;color:#15803d;font-size:40px;font-weight:800;">₹${Number(amount).toFixed(2)}</p>
                <p style="margin:6px 0 0;color:#6b7280;font-size:13px;">owed to ${fromName || "your friend"}</p>
              </div>

              <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
                Please log in to Splitr to review your expenses and settle up when you get a chance. It only takes a few seconds! 🙌
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="http://localhost:3000/dashboard" 
                   style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                  View & Settle Up →
                </a>
              </div>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                This reminder was sent via <strong>Splitr</strong>. If you believe this is an error, please contact ${fromName || "the sender"}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 36px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by Splitr · The smart way to split expenses</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const result = await resend.emails.send({
      from: "Splitr <onboarding@resend.dev>",
      to: toEmail,
      subject: `💸 Payment Reminder: ₹${Number(amount).toFixed(2)} owed to ${fromName || "your friend"}`,
      html,
    });

    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (error) {
    console.error("Reminder email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reminder" },
      { status: 500 }
    );
  }
}
