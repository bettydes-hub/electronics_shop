/**
 * Set a new password for a staff user when you know their email or username.
 *
 * Usage (from project root, DATABASE_URL in .env):
 *   node prisma/reset-staff-password.js admin@localhost "NewPassword123"
 *   node prisma/reset-staff-password.js admin "NewPassword123"
 *
 * To see emails/usernames: npm run db:studio → User table → filter role ADMIN.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const identifier = process.argv[2]?.trim();
  const password = process.argv[3];

  if (!identifier || !password || password.length < 8) {
    console.error(
      "Usage: node prisma/reset-staff-password.js <email-or-username> <new-password>\n" +
        "Password must be at least 8 characters.\n" +
        "List accounts: npm run db:studio"
    );
    process.exit(1);
  }

  const lower = identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: lower }, { username: lower }],
    },
    select: { id: true, email: true, username: true, role: true, staffStatus: true },
  });

  if (!user) {
    console.error('No user found with that email or username. Run: npm run db:studio');
    process.exit(1);
  }

  if (user.staffStatus !== "ACTIVE") {
    console.error("That account is not ACTIVE (e.g. still invited). Fix status in Studio or complete /register.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log("Password updated. Sign in at /login with:");
  console.log(`  Username: ${user.username ?? "(see email — use username field if set)"}`);
  console.log(`  Email on file: ${user.email}`);
  console.log(`  Role: ${user.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
