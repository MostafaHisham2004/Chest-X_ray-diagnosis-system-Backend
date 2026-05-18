const { DataTypes } = require("sequelize");
const { ROLES, ALL_ROLES } = require("../constants/roles");

module.exports = (sequelize) =>
  sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true, notEmpty: true },
        set(value) {
          this.setDataValue("email", String(value).toLowerCase().trim());
        }
      },
      password: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: ROLES.PATIENT,
        validate: { isIn: [ALL_ROLES] }
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    {
      tableName: "Users",
      timestamps: false,
      defaultScope: { attributes: { exclude: ["password"] } },
      scopes: { withPassword: { attributes: {} } }
    }
  );
