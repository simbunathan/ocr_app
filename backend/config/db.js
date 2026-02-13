const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
require('dotenv').config();

const dbType = process.env.DB_TYPE || 'mysql';

let sequelize = null;
let mongooseConnection = null;

if (dbType === 'mysql') {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

const connectDB = async () => {
  try {
    if (dbType === 'mysql') {
      await sequelize.authenticate();
      console.log('✅ MySQL Database connected successfully');

      // Sync models with database
      await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
      console.log('✅ Database models synchronized');
    } else {
      mongooseConnection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ocr_app');
      console.log('✅ MongoDB Database connected successfully');
    }
  } catch (error) {
    console.error(`❌ Unable to connect to ${dbType} database:`, error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB, dbType, mongoose: mongooseConnection };