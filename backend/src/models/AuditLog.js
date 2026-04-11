const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AuditLog = sequelize.define('AuditLog', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  complaintId: { type: DataTypes.INTEGER, allowNull: false },
  action:      { type: DataTypes.STRING,  allowNull: false }, // 'status_change' | 'reassign'
  fromValue:   { type: DataTypes.STRING,  allowNull: true  },
  toValue:     { type: DataTypes.STRING,  allowNull: false },
  changedBy:   { type: DataTypes.STRING,  allowNull: false }, // name of admin/dept user
  changedByRole: { type: DataTypes.STRING, allowNull: false },
}, { timestamps: true });

module.exports = AuditLog;
