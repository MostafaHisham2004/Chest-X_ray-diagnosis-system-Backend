const bcrypt = require("bcrypt");
const { User } = require("../models");
const { ROLES } = require("../constants/roles");

async function ensureAdminExists() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to bootstrap an admin user");
  }

  const existing = await User.findOne({ where: { role: ROLES.ADMIN } });
  if (existing) {
    console.log(`[Bootstrap] Admin already exists: ${existing.email}`);
    return existing;
  }
  const hashed = await bcrypt.hash(adminPassword, 12);
  const admin = await User.create({
    email: adminEmail,
    password: hashed,
    role: ROLES.ADMIN
  });
  console.log(`[Bootstrap] Admin user created: ${adminEmail}`);
  return admin;
}

module.exports = { ensureAdminExists };
