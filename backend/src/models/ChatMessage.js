const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "ChatMessage",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      thread_id: { type: DataTypes.INTEGER, allowNull: false },
      sender_user_id: { type: DataTypes.INTEGER, allowNull: false },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notEmpty: true }
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      read_at: { type: DataTypes.DATE, allowNull: true }
    },
    {
      tableName: "Chat_Messages",
      timestamps: false,
      indexes: [
        { fields: ["thread_id", "created_at"] },
        { fields: ["sender_user_id"] }
      ]
    }
  );
