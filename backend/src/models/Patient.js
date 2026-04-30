const { DataTypes } = require("sequelize");
const { ROLES } = require("../constants/roles");

module.exports = (sequelize) =>
  sequelize.define(
    "Patient",
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
      gender: { type: DataTypes.STRING, allowNull: false },
      dob: { type: DataTypes.DATEONLY, allowNull: false },
      medical_history: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: "Patients", timestamps: false },
  );
