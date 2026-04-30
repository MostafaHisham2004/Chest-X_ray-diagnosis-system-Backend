const bcrypt = require("bcrypt");
const { User } = require("../models");
const { ROLES } = require("../constants/roles");

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin@123";

async function ensureAdminExists() {
  const existing = await User.findOne({ where: { role: ROLES.ADMIN } });
  if (existing) {
    console.log(`[Bootstrap] Admin already exists: ${existing.email}`);
    return existing;
  }
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await User.create({
    email: ADMIN_EMAIL,
    password: hashed,
    role: ROLES.ADMIN
  });
  console.log(`[Bootstrap] Admin user created: ${ADMIN_EMAIL}`);
  return admin;
}

module.exports = { ensureAdminExists };
