const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
  id:         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:       { type: DataTypes.STRING },
  email:      { type: DataTypes.STRING, unique: true },
  password:   { type: DataTypes.TEXT },
  role:       { type: DataTypes.STRING, defaultValue: 'citizen' },
  department: { type: DataTypes.STRING, allowNull: true }, // only for role=department
}, {
  tableName: 'users',
  timestamps: false,
});

module.exports = User;
