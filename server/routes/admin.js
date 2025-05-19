const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Credential = require('../models/Credential');
const router = express.Router();

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;
  
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin routes'
      });
    }
    
    // Add user to req object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }
    
    // Find user
    const user = await User.findOne({ username }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Update last login time
    user.lastLogin = Date.now();
    await user.save();
    
    // Get token
    const token = user.getSignedToken();
    
    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get credentials (protected route)
router.get('/credentials', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const domain = req.query.domain || '';
    
    // Build query
    let query = {};
    
    if (domain) {
      query.domain = domain;
    }
    
    if (search) {
      query = {
        ...query,
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { domain: { $regex: search, $options: 'i' } },
          { website: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const credentials = await Credential.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Credential.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: credentials.length,
      total,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        hasMore: skip + credentials.length < total
      },
      data: credentials
    });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching credentials'
    });
  }
});

// Get stats (protected route)
router.get('/stats', protect, async (req, res) => {
  try {
    const totalCredentials = await Credential.countDocuments();
    const uniqueDomains = await Credential.distinct('domain');
    
    // Get last 7 days stats
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    
    const lastWeekCredentials = await Credential.countDocuments({
      timestamp: { $gte: lastWeekDate }
    });
    
    // Most common domains
    const domains = await Credential.aggregate([
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalCredentials,
        uniqueDomains: uniqueDomains.length,
        lastWeekCredentials,
        topDomains: domains.map(d => ({
          domain: d._id,
          count: d.count
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stats'
    });
  }
});

// Delete credential (protected route)
router.delete('/credentials/:id', protect, async (req, res) => {
  try {
    const credential = await Credential.findById(req.params.id);
    
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: 'Credential not found'
      });
    }
    
    await credential.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting credential:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting credential'
    });
  }
});

module.exports = router;
