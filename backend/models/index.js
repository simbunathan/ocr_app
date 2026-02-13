const { dbType } = require('../config/db');

let User, OcrRecord;

if (dbType === 'mysql') {
  User = require('./sequelize/User');
  OcrRecord = require('./sequelize/OcrRecord');

  // Define associations for Sequelize
  User.hasMany(OcrRecord, {
    foreignKey: 'userId',
    as: 'ocrRecords'
  });

  OcrRecord.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });
} else {
  User = require('./mongoose/User');
  OcrRecord = require('./mongoose/OcrRecord');
}

module.exports = {
  User,
  OcrRecord
};