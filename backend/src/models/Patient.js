const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Patient",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      gender: { type: DataTypes.STRING, allowNull: false },
      dob: { type: DataTypes.DATEONLY, allowNull: false },
      medical_history: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: "Patients", timestamps: false }
  );
