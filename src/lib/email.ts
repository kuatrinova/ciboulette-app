import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function enviarExcelPorEmail(
  excelBuffer: Buffer,
  nombreArchivo: string,
  emailReceptor: string
) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@ciboulette.com",
    to: emailReceptor,
    subject: `Disponibilidad Semanal - ${nombreArchivo.replace(".xlsx", "")}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #6B7B3A;">Ciboulette Catering</h2>
        <p>Se adjunta el archivo de disponibilidad semanal del personal.</p>
        <p style="color: #888; font-size: 12px;">Generado automáticamente por el sistema de disponibilidad.</p>
      </div>
    `,
    attachments: [
      {
        filename: nombreArchivo,
        content: excelBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });
}
