const mongoose = require('mongoose');

const CredentialSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    website: {
      type: String,
      required: [true, 'Website URL is required'],
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Credential', CredentialSchema);
