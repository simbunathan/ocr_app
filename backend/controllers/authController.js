const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { Op } = require('sequelize');
const { dbType } = require('../config/db');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    let existingUser;
    if (dbType === 'mysql') {
      existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }]
        }
      });
    } else {
      existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user - Password hashing is handled by hooks/middleware in models
    const user = await User.create({ username, email, password });

    // Generate token
    const token = jwt.sign({ userId: user.id || user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id || user._id, username, email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Server error during registration',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne(dbType === 'mysql' ? { where: { email } } : { email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password using instance method defined in both models
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id || user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id || user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};