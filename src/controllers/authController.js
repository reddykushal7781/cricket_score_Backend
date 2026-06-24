const User = require('../models/User');
const Player = require('../models/Player');
const jwt = require('jsonwebtoken');

// Generate Token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'antigravity-secret-key', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password' });
    }

    // Check if user exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    // Create user
    const user = await User.create({
      username,
      password,
    });

    // Auto-create or link player profile
    let player = await Player.findOne({
      $or: [
        { name: username },
        { username: username }
      ]
    });

    if (!player) {
      await Player.create({
        name: username,
        username: username,
        role: 'All-rounder',
      });
    } else if (!player.username) {
      player.username = username;
      await player.save();
    }

    // Generate a deterministic integer ID from the MongoDB ObjectId
    const intId = parseInt(user._id.toString().substring(18, 24), 16);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: intId,
        username: user.username,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    // Check for user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      username: user.username,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
