/**
 * Minimal outgoing email (SMTP via nodemailer). Used for password-reset links.
 * Configure with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.
 */
import nodemailer, { type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let override: Transporter | null = null;

/** Tests inject a fake transport here. */
export function setMailTransportForTests(transport: Transporter | null): void {
  override = transport;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport(): Transporter {
  if (override) return override;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (!override && !isMailConfigured()) {
    throw new Error('Email is not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM.');
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport().sendMail({ from, ...message });
}
