/**
 * Makes one account an ADMIN so you can sign in to /admin.
 *
 * Usage (from the project folder):
 *
 *   npm run seed:admin -- you@example.com
 *
 * 1. If an account with that email already exists (for example you signed up
 *    in the shop), it is upgraded to ADMIN. Nothing else about it changes.
 * 2. If it does not exist yet, set a password to create it:
 *
 *   Windows PowerShell:  $env:ADMIN_PASSWORD="a-long-password"; npm run seed:admin -- you@example.com
 *   macOS / Linux:       ADMIN_PASSWORD="a-long-password" npm run seed:admin -- you@example.com
 *
 * Optional: ADMIN_FIRST_NAME and ADMIN_LAST_NAME when creating a new account.
 * The email can also come from the ADMIN_EMAIL environment variable.
 *
 * Safe to run more than once. It never deletes anything.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  const rawEmail = process.argv[2] ?? process.env.ADMIN_EMAIL ?? '';
  const email = rawEmail.trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    console.error('✖ Tell me which email to make an admin, for example:\n    npm run seed:admin -- you@example.com');
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role === 'ADMIN') {
      console.log(`• ${email} is already an ADMIN. Sign in at /login (or /admin/login).`);
      return;
    }
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    console.log(`✔ ${email} is now an ADMIN. Sign in at /login (or /admin/login).`);
    return;
  }

  const password = process.env.ADMIN_PASSWORD ?? '';
  if (password.length < 10) {
    console.error(
      `✖ No account exists for ${email} yet.\n` +
        '  Either sign up in the shop first and run this again, or set ADMIN_PASSWORD (at least 10 characters) to create the account now.',
    );
    process.exitCode = 1;
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firstName: (process.env.ADMIN_FIRST_NAME ?? 'Store').trim() || 'Store',
      lastName: (process.env.ADMIN_LAST_NAME ?? 'Administrator').trim() || 'Administrator',
      role: 'ADMIN',
    },
  });
  console.log(`✔ Created ADMIN account ${email}. Sign in at /login (or /admin/login).`);
}

main()
  .catch((error) => {
    console.error('✖ seed:admin failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
