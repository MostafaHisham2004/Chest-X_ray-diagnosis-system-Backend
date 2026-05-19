const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "ChatThread",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      patient_id: { type: DataTypes.INTEGER, allowNull: false },
      doctor_id: { type: DataTypes.INTEGER, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    {
      tableName: "Chat_Threads",
      timestamps: false,
      indexes: [
        { unique: true, fields: ["patient_id", "doctor_id"] },
        { fields: ["updated_at"] }
      ]
    }
  );
