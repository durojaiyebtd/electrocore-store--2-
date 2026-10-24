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
 * On Coolify (or any Docker host): set ADMIN_EMAIL and ADMIN_PASSWORD as environment
 * variables and redeploy. docker-entrypoint.sh runs this script on every start, so the
 * account is created (or promoted) and its password is set to ADMIN_PASSWORD.
 * Remove ADMIN_PASSWORD afterwards if you want to change the password inside the app.
 * From the Coolify terminal you can also run:  npm run admin:set -- you@example.com
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

  const password = process.env.ADMIN_PASSWORD ?? '';

  if (existing) {
    const data: { role?: 'ADMIN'; passwordHash?: string } = {};
    if (existing.role !== 'ADMIN') data.role = 'ADMIN';
    // When ADMIN_PASSWORD is set (e.g. in Coolify), it is the admin's password: apply it so it can be reset from the host.
    if (password.length >= 10) data.passwordHash = await bcrypt.hash(password, 12);
    else if (password.length > 0) console.warn('• ADMIN_PASSWORD is shorter than 10 characters, so the password was NOT changed.');

    if (Object.keys(data).length === 0) {
      console.log(`• ${email} is already an ADMIN. Sign in at /login (or /admin/login).`);
      return;
    }
    await prisma.user.update({ where: { id: existing.id }, data });
    console.log(
      `✔ ${email} is an ADMIN${data.passwordHash ? ' and its password was set from ADMIN_PASSWORD' : ''}. Sign in at /login (or /admin/login).`,
    );
    return;
  }

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
