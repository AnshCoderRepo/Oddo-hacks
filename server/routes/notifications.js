const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Notification = require('../models/Notification');
const { 
  authenticate, 
  updateLastActive
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createNotificationValidation = [
  body('recipient').isMongoId().withMessage('Valid recipient ID is required'),
  body('type').isIn([
    'answer', 'comment', 'upvote', 'downvote', 'accept', 'mention', 
    'follow', 'badge', 'bounty', 'system', 'moderation'
  ]).withMessage('Invalid notification type'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message must be between 1 and 500 characters')
];

// @route   GET /api/notifications
// @desc    Get notifications for authenticated user
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('unreadOnly').optional().isBoolean().withMessage('UnreadOnly must be a boolean'),
  query('type').optional().isIn([
    'answer', 'comment', 'upvote', 'downvote', 'accept', 'mention', 
    'follow', 'badge', 'bounty', 'system', 'moderation'
  ]).withMessage('Invalid notification type')
], authenticate, updateLastActive, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      type: type || null
    };

    const [notifications, unreadCount] = await Promise.all([
      Notification.getForUser(req.user._id, options),
      Notification.getUnreadCount(req.user._id)
    ]);

    // Calculate pagination
    const total = await Notification.countDocuments({
      recipient: req.user._id,
      isArchived: false,
      ...(options.unreadOnly && { isRead: false }),
      ...(options.type && { type: options.type })
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications'
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count for authenticated user
// @access  Private
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unread count'
    });
  }
});

// @route   GET /api/notifications/:id
// @desc    Get single notification by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('sender', 'username avatar')
      .populate('relatedQuestion', 'title')
      .populate('relatedAnswer', 'content')
      .populate('relatedUser', 'username avatar');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      success: true,
      data: notification
    });

  } catch (error) {
    console.error('Get notification error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notification'
    });
  }
});

// @route   POST /api/notifications
// @desc    Create a new notification (Admin/System only)
// @access  Private (Admin)
router.post('/', authenticate, createNotificationValidation, async (req, res) => {
  try {
    // Only admin can create notifications manually
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      recipient,
      type,
      title,
      message,
      relatedQuestion,
      relatedAnswer,
      relatedUser,
      actionUrl,
      priority,
      metadata,
      expiresAt
    } = req.body;

    const notification = await Notification.createNotification({
      recipient,
      sender: req.user._id,
      type,
      title,
      message,
      relatedQuestion,
      relatedAnswer,
      relatedUser,
      actionUrl,
      priority,
      metadata,
      expiresAt
    });

    if (!notification) {
      return res.status(400).json({
        success: false,
        message: 'Could not create notification'
      });
    }

    await notification.populate('sender', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating notification'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while marking notification as read'
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const result = await Notification.markAllAsReadForUser(req.user._id);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking all notifications as read'
    });
  }
});

// @route   PUT /api/notifications/:id/archive
// @desc    Archive a notification
// @access  Private
router.put('/:id/archive', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await notification.archive();

    res.json({
      success: true,
      message: 'Notification archived successfully'
    });

  } catch (error) {
    console.error('Archive notification error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while archiving notification'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification or is admin
    if (notification.recipient.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while deleting notification'
    });
  }
});

// @route   POST /api/notifications/broadcast
// @desc    Broadcast notification to all users (Admin only)
// @access  Private (Admin)
router.post('/broadcast', authenticate, [
  body('type').isIn(['system', 'moderation']).withMessage('Type must be system or moderation'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message must be between 1 and 500 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res) => {
  try {
    // Only admin can broadcast notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, title, message, priority = 'medium', actionUrl, expiresAt } = req.body;

    // Get all active users (simplified - in production you might want to batch this)
    const User = require('../models/User');
    const users = await User.find({ 
      lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Active in last 30 days
    }).select('_id');

    const notifications = users.map(user => ({
      recipient: user._id,
      sender: req.user._id,
      type,
      title,
      message,
      priority,
      actionUrl,
      expiresAt
    }));

    // Create notifications in batch
    const createdNotifications = await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: `Broadcast notification sent to ${createdNotifications.length} users`,
      data: {
        recipientCount: createdNotifications.length
      }
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while broadcasting notification'
    });
  }
});

// @route   DELETE /api/notifications/cleanup
// @desc    Clean up old archived notifications (Admin only)
// @access  Private (Admin)
router.delete('/cleanup', authenticate, [
  query('daysOld').optional().isInt({ min: 1, max: 365 }).withMessage('DaysOld must be between 1 and 365')
], async (req, res) => {
  try {
    // Only admin can cleanup notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { daysOld = 30 } = req.query;

    const result = await Notification.cleanupOld(parseInt(daysOld));

    res.json({
      success: true,
      message: `Cleaned up old notifications`,
      data: {
        deletedCount: result.deletedCount
      }
    });

  } catch (error) {
    console.error('Cleanup notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cleaning up notifications'
    });
  }
});

module.exports = router;
