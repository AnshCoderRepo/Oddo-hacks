const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Middleware to check if user is moderator or admin
const requireModerator = (req, res, next) => {
  if (!req.user || !['moderator', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Moderator privileges required.'
    });
  }
  next();
};

// Middleware to check if user owns the resource or is admin/moderator
const requireOwnershipOrModerator = (resourceField = 'author') => {
  return (req, res, next) => {
    // Admin and moderators can access any resource
    if (req.user && ['admin', 'moderator'].includes(req.user.role)) {
      return next();
    }

    // Check if user owns the resource
    const resource = req.resource || req.body;
    
    if (!resource || !resource[resourceField]) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    if (resource[resourceField].toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own content.'
      });
    }

    next();
  };
};

// Middleware to check reputation requirements
const requireReputation = (minReputation) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (req.user.reputation < minReputation) {
      return res.status(403).json({
        success: false,
        message: `This action requires ${minReputation} reputation points. You have ${req.user.reputation}.`
      });
    }

    next();
  };
};

// Middleware to rate limit actions per user
const rateLimit = require('express-rate-limit');

const createUserRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 5, // limit each user to 5 requests per windowMs
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    keyGenerator: (req) => {
      return req.user ? req.user._id.toString() : req.ip;
    },
    skipSuccessfulRequests
  });
};

// Middleware to update user's last active timestamp
const updateLastActive = async (req, res, next) => {
  if (req.user) {
    try {
      // Update last active time without waiting for the response
      req.user.updateLastActive().catch(console.error);
    } catch (error) {
      // Log error but don't block the request
      console.error('Error updating last active:', error);
    }
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireModerator,
  requireOwnershipOrModerator,
  requireReputation,
  createUserRateLimit,
  updateLastActive
};
