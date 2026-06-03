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
  await sequelize.query('CREATE TABLE IF NOT EXISTS "Users" (id SERIAL PRIMARY KEY)');
  await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS email VARCHAR(255)');
  await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS password VARCHAR(255)');
  await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT \'patient\'');
  await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
  await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
  await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON "Users" (email)');

  await sequelize.query('ALTER TABLE "Patients" ADD COLUMN IF NOT EXISTS user_id INTEGER');
  await sequelize.query('ALTER TABLE "Patients" ADD COLUMN IF NOT EXISTS phone VARCHAR(64)');
  await sequelize.query('CREATE INDEX IF NOT EXISTS patients_phone_idx ON "Patients" (phone)');
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

  await sequelize.query(`CREATE TABLE IF NOT EXISTS "Patient_Doctor_Connections" (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,
    patient_phone VARCHAR(64) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    linked_patient_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`);
  await sequelize.query('CREATE INDEX IF NOT EXISTS patient_doctor_connections_lookup_idx ON "Patient_Doctor_Connections" (patient_phone, status, expires_at)');
  await sequelize.query('CREATE INDEX IF NOT EXISTS patient_doctor_connections_doctor_idx ON "Patient_Doctor_Connections" (doctor_id)');
  await addConstraintIfMissing(
    sequelize,
    "Patient_Doctor_Connections",
    "patient_doctor_connections_doctor_id_fk",
    'FOREIGN KEY (doctor_id) REFERENCES "Doctors"(id) ON UPDATE CASCADE ON DELETE CASCADE'
  );
  await addConstraintIfMissing(
    sequelize,
    "Patient_Doctor_Connections",
    "patient_doctor_connections_patient_id_fk",
    'FOREIGN KEY (linked_patient_id) REFERENCES "Patients"(id) ON UPDATE CASCADE ON DELETE SET NULL'
  );
}

module.exports = { ensureAuthSchema };
