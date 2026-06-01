const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "PatientDoctorConnection",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      doctor_id: { type: DataTypes.INTEGER, allowNull: false },
      patient_phone: { type: DataTypes.STRING, allowNull: false },
      code_hash: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      sent_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      linked_patient_id: { type: DataTypes.INTEGER, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { tableName: "Patient_Doctor_Connections", timestamps: false }
  );
