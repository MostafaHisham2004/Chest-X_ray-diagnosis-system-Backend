const { DataTypes } = require("sequelize");
const { VERIFICATION_STATUS } = require("../constants/roles");


module.exports = (sequelize) =>
  sequelize.define(
    "Doctor",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: { type: DataTypes.STRING, allowNull: false },
      specialization: { type: DataTypes.STRING, allowNull: false },
      medical_certificate: { type: DataTypes.STRING, allowNull: false },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      verification_status: {
        type: DataTypes.ENUM(
          VERIFICATION_STATUS.PENDING,
          VERIFICATION_STATUS.APPROVED,
          VERIFICATION_STATUS.REJECTED
        ),
        allowNull: false,
        defaultValue: VERIFICATION_STATUS.PENDING
      },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      verified_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      }
    },
    { tableName: "Doctors", timestamps: false }
  );
