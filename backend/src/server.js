require("dotenv").config();
const fs = require("fs");
const path = require("path");
const app = require("./app");
const { sequelize } = require("./models");
const { ensureAuthSchema } = require("./config/migrateAdminColumn");
const { ensureAdminExists } = require("./utils/booststrapAdmin");
const { getSocket } = require("./services/whatsappService");

const port = Number(process.env.PORT || 5000);
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

async function ensureDatabaseSchema() {
  await sequelize.query(`
    DO $$
    DECLARE
      table_name text;
      default_role text;
    BEGIN
      FOREACH table_name IN ARRAY ARRAY['Patients', 'patients', 'Doctors', 'doctors', 'Users', 'users']
      LOOP
        IF to_regclass(format('%I', table_name)) IS NOT NULL THEN
          default_role := CASE
            WHEN lower(table_name) = 'doctors' THEN 'doctor'
            ELSE 'patient'
          END;

          EXECUTE format(
            'ALTER TABLE %I ADD COLUMN IF NOT EXISTS role VARCHAR(20)',
            table_name
          );

          EXECUTE format(
            'ALTER TABLE %I ADD COLUMN IF NOT EXISTS phone VARCHAR(40)',
            table_name
          );

          EXECUTE format(
            'ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false',
            table_name
          );

          EXECUTE format(
            'ALTER TABLE %I ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT ''pending''',
            table_name
          );

          EXECUTE format(
            'UPDATE %I SET role = %L WHERE role IS NULL',
            table_name,
            default_role
          );

          EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN role SET DEFAULT %L',
            table_name,
            default_role
          );

          EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN role SET NOT NULL',
            table_name
          );
        END IF;
      END LOOP;
    END $$;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF to_regclass('"Patients"') IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_role_check') THEN
        ALTER TABLE "Patients"
          ADD CONSTRAINT patients_role_check CHECK (role IN ('patient')) NOT VALID;
      END IF;

      IF to_regclass('patients') IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_lower_role_check') THEN
        ALTER TABLE patients
          ADD CONSTRAINT patients_lower_role_check CHECK (role IN ('patient')) NOT VALID;
      END IF;

      IF to_regclass('"Doctors"') IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doctors_role_check') THEN
        ALTER TABLE "Doctors"
          ADD CONSTRAINT doctors_role_check CHECK (role IN ('doctor', 'admin')) NOT VALID;
      END IF;

      IF to_regclass('doctors') IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doctors_lower_role_check') THEN
        ALTER TABLE doctors
          ADD CONSTRAINT doctors_lower_role_check CHECK (role IN ('doctor', 'admin')) NOT VALID;
      END IF;

      IF to_regclass('"Users"') IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE "Users"
          ADD CONSTRAINT users_role_check CHECK (role IN ('patient', 'doctor', 'admin')) NOT VALID;
      END IF;

      IF to_regclass('users') IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_lower_role_check') THEN
        ALTER TABLE users
          ADD CONSTRAINT users_lower_role_check CHECK (role IN ('patient', 'doctor', 'admin')) NOT VALID;
      END IF;
    END $$;
  `);

  const [roleColumns] = await sequelize.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name IN ('Patients', 'patients', 'Doctors', 'doctors', 'Users', 'users')
      AND column_name IN ('role', 'phone', 'is_verified', 'verification_status')
    ORDER BY table_name;
  `);

  // eslint-disable-next-line no-console
  console.log("[DB] Role column check:", roleColumns);
}

async function start() {
  try {
    await sequelize.authenticate();
    const [[databaseInfo]] = await sequelize.query(
      "SELECT current_database() AS database, current_schema() AS schema, current_user AS user"
    );
    // eslint-disable-next-line no-console
    console.log(
      `[DB] Connected to ${databaseInfo.user}@${databaseInfo.database}, schema ${databaseInfo.schema}`
    );
    await ensureDatabaseSchema();
    await sequelize.sync();
    await ensureAuthSchema(sequelize);
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      await ensureAdminExists();
    }
    app.listen(port, "0.0.0.0", () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://0.0.0.0:${port} (LAN devices: use your laptop IP)`);
    });

    // Initialize WhatsApp connection so the pairing code appears on startup
    getSocket().catch((err) => console.error("[WhatsApp] init error:", err.message));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Startup failed", error);
    process.exit(1);
  }
}

start();
