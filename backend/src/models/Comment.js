const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Comment = sequelize.define('Comment', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  complaintId: { type: DataTypes.INTEGER, allowNull: false },
  authorName:  { type: DataTypes.STRING,  allowNull: false },
  authorEmail: { type: DataTypes.STRING,  allowNull: false },
  role:        { type: DataTypes.STRING,  defaultValue: 'citizen' },
  text:        { type: DataTypes.TEXT,    allowNull: false },
}, { timestamps: true });

module.exports = Comment;
