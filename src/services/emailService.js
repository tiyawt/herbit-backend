import nodemailer from "nodemailer";

export async function sendResetPasswordEmail(to, username, token) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false, // 587 = STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Herbit Support" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Herbit Password Reset",
    html: `
      <!doctype html>
      <html>
        <body style="font-family: Arial, sans-serif; background:#ffffff; color:#111; margin:0; padding:16px;">
          <p style="margin:0 0 12px;">Salam ${username || "Sahabat Herbit"}.</p>

          <p style="margin:0 0 12px;">
            Anda telah melakukan permintaan untuk mereset password Akun <b>Herbit</b> Anda.
            Untuk melanjutkan prosesnya, silakan klik tombol di bawah ini:
          </p>

          <p style="margin:0 0 16px;">
            <a href="${resetLink}"
              style="display:inline-block; padding:10px 16px; background:#16a34a; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:600;">
              Reset Password
            </a>
          </p>

          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />

          <div style="font-size:14px;color:#444;">
            <p style="margin:0 0 8px;">
              Link di atas berlaku selama <b>15 menit</b>. Bila sudah melebihi waktu tersebut, Anda dapat mengirim permintaan baru.
            </p>
            <p style="margin:0 0 8px;">
              Namun bila Anda tidak pernah meminta proses ini, maka kami berharap Anda mengabaikan email ini.
            </p>

            <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;">Terima kasih,</p>
              <p style="margin:0;font-weight:600;color:#16a34a;">Tim Herbit</p>
            </div>
          </div>

        </body>
      </html>
    `,
  });

  console.log("📧 Email reset terkirim ke:", to);
}
