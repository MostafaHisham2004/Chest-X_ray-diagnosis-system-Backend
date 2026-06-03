const { DataTypes } = require("sequelize");
const { ROLES } = require("../constants/roles");

module.exports = (sequelize) =>
  sequelize.define(
    "Patient",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      password: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN),
        allowNull: false,
        defaultValue: ROLES.PATIENT,
        validate: { isIn: [[ROLES.PATIENT]] }
      },
      gender: { type: DataTypes.STRING, allowNull: false },
      dob: { type: DataTypes.DATEONLY, allowNull: false },
      medical_history: { type: DataTypes.TEXT, allowNull: true },
      is_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      verification_status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" }
    },
    { tableName: "Patients", timestamps: false }
  );
