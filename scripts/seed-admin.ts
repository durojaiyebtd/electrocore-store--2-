/**
 * Promote a registered account to the ADMIN role (or remove admin access).
 *
 *   1. Create your account on the store first: header -> Sign In -> Quick sign-up.
 *   2. Run one of:
 *        npm run seed:admin -- --email you@example.com            make this account an admin
 *        npm run seed:admin -- --email you@example.com --revoke   turn it back into a customer
 *        npm run seed:admin                                       uses SEED_ADMIN_EMAIL from .env,
 *                                                                 or lists current admins
 *   3. Refresh the store. The [Admin Portal] link appears in the header.
 *
 * New registrations are always CUSTOMER; this script (or Admin -> Customers -> Make admin)
 * is the only way to grant admin access. The store always keeps at least one admin.
 */
import { prisma } from '../src/lib/prisma';

function argValue(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.slice(name.length + 3) : undefined;
}

const hasFlag = (name: string) => process.argv.slice(2).includes(`--${name}`);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listAdmins(): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, firstName: true, lastName: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (admins.length === 0) {
    console.log('  No admin accounts yet.');
    return;
  }
  console.log(`  Current admins (${admins.length}):`);
  for (const admin of admins) {
    console.log(`   • ${admin.email} (${admin.firstName} ${admin.lastName})`);
  }
}

async function main(): Promise<void> {
  const email = (argValue('email') ?? process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const revoke = hasFlag('revoke');

  console.log('▶ MAGNIFICENT ELECTROCORE SYNERGY LTD — admin access');

  if (!email) {
    console.log('  Usage: npm run seed:admin -- --email you@example.com [--revoke]');
    await listAdmins();
    return;
  }
  if (!EMAIL_RE.test(email)) {
    console.error(`✖ "${email}" is not a valid email address.`);
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`✖ No account uses ${email}.`);
    console.error('  Register on the store first (header → Sign In → Quick sign-up), then run this command again.');
    process.exitCode = 1;
    return;
  }

  if (revoke) {
    if (user.role !== 'ADMIN') {
      console.log(`  • ${email} is already a customer. Nothing to change.`);
      return;
    }
    const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', id: { not: user.id } } });
    if (otherAdmins === 0) {
      console.error(`✖ ${email} is the only admin. Make another account an admin first, so the store is never left without one.`);
      process.exitCode = 1;
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: 'CUSTOMER' } });
    console.log(`  ✓ ${email} is now a customer. Their admin access ends on their next click.`);
    await listAdmins();
    return;
  }

  if (user.role === 'ADMIN') {
    console.log(`  • ${email} is already an admin.`);
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    console.log(`  ✓ ${email} (${user.firstName} ${user.lastName}) is now an ADMIN.`);
  }
  console.log('  Next: refresh the store in your browser. The [Admin Portal] link appears in the header.');
  console.log('  (If it does not, sign out and sign back in.)');
  await listAdmins();
}

main()
  .catch((error) => {
    console.error('✖ Could not update admin access:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
