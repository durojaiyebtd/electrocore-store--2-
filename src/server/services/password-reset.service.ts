/**
 * Password reset by emailed one-time link.
 *
 * - The link holds a random 256-bit token; only its SHA-256 hash is stored.
 * - Links expire after 30 minutes and work once; asking again invalidates older links.
 * - "Forgot password" always answers the same way, whether or not the email has an account.
 * - The link is built from NEXT_PUBLIC_APP_URL, never from request headers.
 */
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/http';
import { sendMail } from '@/lib/mailer';
import { site } from '@/lib/site';

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function resetEmail(link: string, firstName: string) {
  const text = `Hello ${firstName},\n\nWe received a request to reset your ${site.shortName} password.\nOpen this link to choose a new one (valid for 30 minutes, works once):\n\n${link}\n\nIf you did not ask for this, you can ignore this email and your password will stay the same.\n\n${site.legalName}`;
  const html = `<p>Hello ${firstName.replace(/[<>&"]/g, '')},</p><p>We received a request to reset your ${site.shortName} password.</p><p><a href="${link}">Choose a new password</a> (valid for 30 minutes, works once).</p><p>If you did not ask for this, you can ignore this email and your password will stay the same.</p><p>${site.legalName}</p>`;
  return { subject: `Reset your ${site.shortName} password`, text, html };
}

/** Always resolves quietly; callers show the same message either way. */
export async function requestPasswordReset(email: string): Promise<void> {
  const now = Date.now();
  await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } } });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(now - RESEND_COOLDOWN_MS) } },
  });
  if (recent) return; // too soon after the last request

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  const token = randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(now + RESET_TOKEN_TTL_MS) },
  });

  const link = `${site.url}/admin/reset-password?token=${token}`;
  // Not awaited, so response time does not reveal whether the account exists.
  void sendMail({ to: user.email, ...resetEmail(link, user.firstName) }).catch((error: unknown) => {
    console.error('[password-reset] Could not send the reset email:', error instanceof Error ? error.message : error);
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const invalid = () => new ApiError(400, 'This reset link is invalid or has expired. Please request a new one.', 'RESET_TOKEN_INVALID');
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) throw invalid();

  // Claim the token first so two simultaneous requests cannot both use it.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) throw invalid();

  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } });
}
