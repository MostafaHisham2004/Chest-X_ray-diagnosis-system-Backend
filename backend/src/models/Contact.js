const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Contact",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Doctors",
          key: "user_id"
        }
      },
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Patients",
          key: "user_id"
        }
      },
      status: {
        type: DataTypes.ENUM("PENDING_VERIFICATION", "ACTIVE"),
        allowNull: false,
        defaultValue: "PENDING_VERIFICATION"
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: "Contacts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
