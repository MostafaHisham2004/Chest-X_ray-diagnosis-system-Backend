const { DataTypes } = require("sequelize");
const { VERIFICATION_STATUS } = require("../constants/roles");

module.exports = (sequelize) =>
  sequelize.define(
    "Doctor",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      specialization: { type: DataTypes.STRING, allowNull: false },
      medical_certificate: { type: DataTypes.STRING, allowNull: false },
      is_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      verification_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: VERIFICATION_STATUS.PENDING,
        validate: { isIn: [Object.values(VERIFICATION_STATUS)] }
      },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      verified_by: { type: DataTypes.INTEGER, allowNull: true }
    },
    { tableName: "Doctors", timestamps: false }
  );
