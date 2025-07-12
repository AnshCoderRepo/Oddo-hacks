const express = require('express');
const { body, validationResult, query } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Tag = require('../models/Tag');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { 
  authenticate, 
  optionalAuth, 
  requireOwnershipOrModerator,
  createUserRateLimit,
  updateLastActive
} = require('../middleware/auth');

const router = express.Router();

// Rate limiting for question creation
const questionCreateRateLimit = createUserRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 questions per hour
  message: 'Too many questions created. Please wait before posting another question.'
});

// HTML sanitization options
const sanitizeOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'img'
  ],
  allowedAttributes: {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title', 'width', 'height']
  },
  allowedSchemes: ['http', 'https', 'mailto']
};

// Validation rules
const createQuestionValidation = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 30 })
    .withMessage('Content must be at least 30 characters'),
  body('tags')
    .isArray({ min: 1, max: 5 })
    .withMessage('Please provide 1-5 tags')
    .custom((tags) => {
      if (!tags.every(tag => typeof tag === 'string' && tag.length <= 30)) {
        throw new Error('Each tag must be a string with max 30 characters');
      }
      return true;
    })
];

const updateQuestionValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 30 })
    .withMessage('Content must be at least 30 characters'),
  body('tags')
    .optional()
    .isArray({ min: 1, max: 5 })
    .withMessage('Please provide 1-5 tags')
];

// Helper function to process tags
const processTags = async (tags, userId) => {
  const processedTags = [];
  
  for (const tagName of tags) {
    const normalizedTag = tagName.toLowerCase().trim();
    if (normalizedTag) {
      // Find or create tag
      const tag = await Tag.findOrCreate(normalizedTag, userId);
      await tag.incrementUsage();
      processedTags.push(normalizedTag);
    }
  }
  
  return processedTags;
};

// @route   GET /api/questions
// @desc    Get all questions with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('sort').optional().isIn(['newest', 'oldest', 'votes', 'views', 'answers', 'active']).withMessage('Invalid sort option'),
  query('tag').optional().isString().withMessage('Tag must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('answered').optional().isBoolean().withMessage('Answered must be a boolean')
], optionalAuth, async (req, res) => {
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
      sort = 'newest',
      tag,
      search,
      answered,
      author
    } = req.query;

    // Build query
    const query = { isClosed: false };
    
    if (tag) {
      query.tags = { $in: [tag.toLowerCase()] };
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (answered !== undefined) {
      query.isAnswered = answered === 'true';
    }
    
    if (author) {
      query.author = author;
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'votes':
        sortOption = { votes: -1, createdAt: -1 };
        break;
      case 'views':
        sortOption = { views: -1, createdAt: -1 };
        break;
      case 'answers':
        sortOption = { 'answers.length': -1, createdAt: -1 };
        break;
      case 'active':
        sortOption = { lastActivity: -1 };
        break;
      default: // newest
        sortOption = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [questions, total] = await Promise.all([
      Question.find(query)
        .populate('author', 'username avatar reputation')
        .populate('lastActivityBy', 'username')
        .populate('acceptedAnswer')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Question.countDocuments(query)
    ]);

    // Add answer count and format response
    const formattedQuestions = questions.map(question => ({
      ...question,
      answerCount: question.answers ? question.answers.length : 0
    }));

    res.json({
      success: true,
      data: formattedQuestions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalQuestions: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching questions'
    });
  }
});

// @route   GET /api/questions/:id
// @desc    Get single question by ID
// @access  Public
router.get('/:id', optionalAuth, updateLastActive, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'username avatar reputation role createdAt')
      .populate('lastActivityBy', 'username')
      .populate('acceptedAnswer')
      .populate({
        path: 'answers',
        populate: {
          path: 'author',
          select: 'username avatar reputation role'
        }
      });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Add view if user is authenticated and hasn't viewed before
    if (req.user) {
      await question.addView(req.user._id);
    } else {
      // For anonymous users, just increment view count
      question.views += 1;
      await question.save();
    }

    res.json({
      success: true,
      data: question
    });

  } catch (error) {
    console.error('Get question error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching question'
    });
  }
});

// @route   POST /api/questions
// @desc    Create a new question
// @access  Private
router.post('/', authenticate, questionCreateRateLimit, createQuestionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let { title, content, tags } = req.body;

    // Sanitize HTML content
    content = sanitizeHtml(content, sanitizeOptions);

    // Process tags
    const processedTags = await processTags(tags, req.user._id);

    // Create question
    const question = new Question({
      title,
      content,
      tags: processedTags,
      author: req.user._id,
      lastActivityBy: req.user._id
    });

    await question.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.questionsAsked': 1 }
    });

    // Populate author info
    await question.populate('author', 'username avatar reputation');

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: question
    });

  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating question'
    });
  }
});

// @route   PUT /api/questions/:id
// @desc    Update a question
// @access  Private (Author or Moderator)
router.put('/:id', authenticate, updateQuestionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check ownership or moderator status
    req.resource = question;
    const ownershipCheck = requireOwnershipOrModerator();
    await new Promise((resolve, reject) => {
      ownershipCheck(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    let { title, content, tags } = req.body;

    // Sanitize HTML content if provided
    if (content) {
      content = sanitizeHtml(content, sanitizeOptions);
    }

    // Process tags if provided
    let processedTags;
    if (tags) {
      processedTags = await processTags(tags, req.user._id);
    }

    // Update fields
    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (processedTags) updateData.tags = processedTags;
    
    updateData.lastActivity = new Date();
    updateData.lastActivityBy = req.user._id;

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'username avatar reputation');

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion
    });

  } catch (error) {
    console.error('Update question error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating question'
    });
  }
});

// @route   DELETE /api/questions/:id
// @desc    Delete a question
// @access  Private (Author or Moderator)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check ownership or moderator status
    req.resource = question;
    const ownershipCheck = requireOwnershipOrModerator();
    await new Promise((resolve, reject) => {
      ownershipCheck(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Delete associated answers
    await Answer.deleteMany({ question: req.params.id });

    // Delete the question
    await Question.findByIdAndDelete(req.params.id);

    // Update user stats
    await User.findByIdAndUpdate(question.author, {
      $inc: { 'stats.questionsAsked': -1 }
    });

    // Decrement tag usage
    for (const tagName of question.tags) {
      const tag = await Tag.findOne({ name: tagName });
      if (tag) {
        await tag.decrementUsage();
      }
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Delete question error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while deleting question'
    });
  }
});

// @route   POST /api/questions/:id/vote
// @desc    Vote on a question
// @access  Private
router.post('/:id/vote', authenticate, [
  body('type').isIn(['upvote', 'downvote']).withMessage('Type must be upvote or downvote')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type } = req.body;
    const question = await Question.findById(req.params.id).populate('author');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Users cannot vote on their own questions
    if (question.author._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot vote on your own question'
      });
    }

    // Apply vote
    if (type === 'upvote') {
      await question.addUpvote(req.user._id);
      
      // Create notification for upvote
      await Notification.notifyUpvote(
        question.author._id,
        req.user._id,
        question,
        'question'
      );
      
      // Update author reputation (+5 for question upvote)
      await question.author.updateReputation(5);
    } else {
      await question.addDownvote(req.user._id);
      
      // Update author reputation (-2 for question downvote)
      await question.author.updateReputation(-2);
    }

    res.json({
      success: true,
      message: `${type} recorded successfully`,
      votes: question.votes
    });

  } catch (error) {
    console.error('Vote question error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while voting'
    });
  }
});

module.exports = router;
