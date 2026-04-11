const { DataTypes } = require('sequelize');
const sequelize = require('../database');

// SLA hours by priority
const SLA_HOURS = { high: 24, medium: 72, low: 168 };

const Complaint = sequelize.define('Complaint', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  citizenName: { type: DataTypes.STRING, allowNull: false },
  email:       { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT,   allowNull: false },
  imageUrl:    { type: DataTypes.TEXT,   allowNull: true },
  location:    { type: DataTypes.STRING, allowNull: true },
  category:    { type: DataTypes.STRING, defaultValue: 'other' },
  department:  { type: DataTypes.STRING },
  priority:    { type: DataTypes.STRING, defaultValue: 'medium' },
  status:      { type: DataTypes.STRING, defaultValue: 'pending' },
  dueDate:     { type: DataTypes.DATE,   allowNull: true },
  upvotes:     { type: DataTypes.INTEGER, defaultValue: 0 },
  upvotedBy:   {
    type: DataTypes.TEXT, defaultValue: '[]',
    get() { try { return JSON.parse(this.getDataValue('upvotedBy')); } catch { return []; } },
    set(v) { this.setDataValue('upvotedBy', JSON.stringify(v)); },
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate(complaint) {
      const hours = SLA_HOURS[complaint.priority] || 72;
      complaint.dueDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    },
  },
});

module.exports = Complaint;
