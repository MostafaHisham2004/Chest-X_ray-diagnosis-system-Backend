/**
 * Promote a user to admin by email.
 * Usage: node scripts/set-admin.js doctor@example.com
 */
require("dotenv").config();
const { sequelize, Doctor, Patient } = require("../src/models");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/set-admin.js <email>");
    process.exit(1);
  }

  await sequelize.authenticate();
  const { ensureAdminColumns } = require("../src/config/migrateAdminColumn");
  await ensureAdminColumns(sequelize);

  let user = await Doctor.findOne({ where: { email } });
  let table = "Doctors";

  if (!user) {
    user = await Patient.findOne({ where: { email } });
    table = "Patients";
  }

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  await user.update({ is_admin: true });
  console.log(`[OK] ${email} is now an admin (${table}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
