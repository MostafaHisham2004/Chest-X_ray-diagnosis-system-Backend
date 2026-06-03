BEGIN;

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS "Patients"
  ADD COLUMN IF NOT EXISTS "role" user_role NOT NULL DEFAULT 'patient';

ALTER TABLE IF EXISTS "Doctors"
  ADD COLUMN IF NOT EXISTS "role" user_role NOT NULL DEFAULT 'doctor';

UPDATE "Patients" SET "role" = 'patient' WHERE "role" IS NULL;
UPDATE "Doctors" SET "role" = 'doctor' WHERE "role" IS NULL;

DO $$
BEGIN
  IF to_regclass('"Patients"') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'patients_role_check'
     ) THEN
    ALTER TABLE "Patients"
      ADD CONSTRAINT patients_role_check CHECK ("role" = 'patient') NOT VALID;
  END IF;

  IF to_regclass('"Doctors"') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'doctors_role_check'
     ) THEN
    ALTER TABLE "Doctors"
      ADD CONSTRAINT doctors_role_check CHECK ("role" IN ('doctor', 'admin')) NOT VALID;
  END IF;
END $$;

-- If your deployed database uses one generic table instead of this repo's
-- "Patients" and "Doctors" tables, use this block as well:
-- ALTER TABLE IF EXISTS "Users"
--   ADD COLUMN IF NOT EXISTS "role" user_role NOT NULL DEFAULT 'patient';

COMMIT;
