async function addConstraintIfMissing(sequelize, tableName, constraintName, sql) {
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${constraintName}'
      ) THEN
        ALTER TABLE "${tableName}" ADD CONSTRAINT "${constraintName}" ${sql};
      END IF;
    END $$;
  `);
}

async function ensureAuthSchema(sequelize) {
  await sequelize.query('ALTER TABLE "Patients" ADD COLUMN IF NOT EXISTS user_id INTEGER');
  await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS patients_user_id_unique ON "Patients" (user_id)');
  await addConstraintIfMissing(
    sequelize,
    "Patients",
    "patients_user_id_users_id_fk",
    'FOREIGN KEY (user_id) REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE CASCADE'
  );

  await sequelize.query('ALTER TABLE "Doctors" ADD COLUMN IF NOT EXISTS user_id INTEGER');
  await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS doctors_user_id_unique ON "Doctors" (user_id)');
  await sequelize.query('ALTER TABLE "Doctors" ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false');
  await sequelize.query(
    'ALTER TABLE "Doctors" ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) NOT NULL DEFAULT \'pending\''
  );
  await sequelize.query('ALTER TABLE "Doctors" ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE');
  await sequelize.query('ALTER TABLE "Doctors" ADD COLUMN IF NOT EXISTS verified_by INTEGER');
  await addConstraintIfMissing(
    sequelize,
    "Doctors",
    "doctors_user_id_users_id_fk",
    'FOREIGN KEY (user_id) REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE CASCADE'
  );
}

module.exports = { ensureAuthSchema };
