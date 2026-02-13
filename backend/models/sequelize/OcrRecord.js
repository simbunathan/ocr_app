const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const OcrRecord = sequelize.define('OcrRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id', // ✅ maps to DB column if your table uses snake_case
    references: {
      model: 'users',
      key: 'id'
    }
  },
  imagePath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  extractedText: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'eng'
  },
  status: {
    type: DataTypes.ENUM('processing', 'completed', 'failed'),
    defaultValue: 'processing'
  }
}, {
  tableName: 'ocr_records',
  timestamps: true
});

module.exports = OcrRecord;