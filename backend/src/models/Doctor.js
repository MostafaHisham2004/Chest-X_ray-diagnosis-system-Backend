const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Doctor",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      specialization: { type: DataTypes.STRING, allowNull: false },
      medical_certificate: { type: DataTypes.STRING, allowNull: false }
    },
    { tableName: "Doctors", timestamps: false }
  );
