/**
 * Deletes ALL staff user accounts so you can use /setup again (first-time flow).
 * Does not delete products, orders, categories, etc. — only User + invite/reset rows (cascade).
 *
 * Run (from project root):
 *   npm run staff:reset-to-setup -- --i-understand
 *
 * Then: clear site data for localhost (or sign out), open http://localhost:3000/setup
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes("--i-understand")) {
    console.error(
      "This removes every staff login. To continue, run:\n" +
        "  npm run staff:reset-to-setup -- --i-understand"
    );
    process.exit(1);
  }

  const before = await prisma.user.count();
  const { count } = await prisma.user.deleteMany({});
  console.log(`Removed ${count} user account(s) (expected ${before}).`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. In your browser: clear cookies + localStorage for this site (or use a private window).");
  console.log("  2. Open: /setup");
  console.log("  3. Create a new admin username, email, and password you will remember.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
