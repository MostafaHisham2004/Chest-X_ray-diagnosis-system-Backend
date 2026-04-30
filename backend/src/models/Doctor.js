const { DataTypes } = require("sequelize");
const { ROLES } = require("../constants/roles");

module.exports = (sequelize) =>
  sequelize.define(
    "Doctor",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN),
        allowNull: false,
        defaultValue: ROLES.DOCTOR,
        validate: { isIn: [[ROLES.DOCTOR, ROLES.ADMIN]] }
      },
      specialization: { type: DataTypes.STRING, allowNull: false },
      medical_certificate: { type: DataTypes.STRING, allowNull: false }
    },
    { tableName: "Doctors", timestamps: false }
  );
