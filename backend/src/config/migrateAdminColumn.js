async function ensureAdminColumns(sequelize) {
  await sequelize.query(
    'ALTER TABLE "Doctors" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false'
  );
  await sequelize.query(
    'ALTER TABLE "Patients" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false'
  );
}

module.exports = { ensureAdminColumns };
