/**
 * Promote a user to admin by email.
 * Usage: node scripts/set-admin.js doctor@example.com
 */
require("dotenv").config();
const { sequelize, User } = require("../src/models");
const { ensureAuthSchema } = require("../src/config/migrateAdminColumn");
const { ROLES } = require("../src/constants/roles");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/set-admin.js <email>");
    process.exit(1);
  }

  await sequelize.authenticate();
  await ensureAuthSchema(sequelize);

  const user = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  await user.update({ role: ROLES.ADMIN, updated_at: new Date() });
  console.log(`[OK] ${email} is now an admin.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
