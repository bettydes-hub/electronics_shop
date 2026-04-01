/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
  if (!password || password.length < 8) {
    console.log(
      "Skip: use /setup in the browser for first admin, or set BOOTSTRAP_ADMIN_PASSWORD (min 8) in .env."
    );
    return;
  }

  const count = await prisma.user.count();
  if (count > 0) {
    console.log("Skip: users already exist. Remove them or use Admin → Staff to add accounts.");
    return;
  }

  const username = (
    process.env.BOOTSTRAP_ADMIN_USERNAME?.trim() || "admin"
  ).toLowerCase();
  const email = (
    process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || "admin@localhost"
  ).toLowerCase();
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Administrator";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      email,
      name,
      passwordHash,
      role: "ADMIN",
      staffStatus: "ACTIVE",
    },
  });
  console.log(`Bootstrap admin created. Sign in at /login as "${username}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
