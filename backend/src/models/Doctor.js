const { DataTypes } = require("sequelize");
const { VERIFICATION_STATUS } = require("../constants/roles");

module.exports = (sequelize) =>
  sequelize.define(
    "Doctor",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      password: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN),
        allowNull: false,
        defaultValue: VERIFICATION_STATUS.PENDING,
        validate: { isIn: [Object.values(VERIFICATION_STATUS)] }
      },
      specialization: { type: DataTypes.STRING, allowNull: false },
      medical_certificate: { type: DataTypes.STRING, allowNull: false },
      is_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      verification_status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" }
    },
    { tableName: "Doctors", timestamps: false }
  );
