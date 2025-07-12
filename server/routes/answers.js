const express = require('express');
const { body, validationResult, query } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
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

// Rate limiting for answer creation
const answerCreateRateLimit = createUserRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 answers per hour
  message: 'Too many answers created. Please wait before posting another answer.'
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
const createAnswerValidation = [
  body('content')
    .trim()
    .isLength({ min: 20 })
    .withMessage('Answer must be at least 20 characters'),
  body('questionId')
    .isMongoId()
    .withMessage('Invalid question ID')
];

const updateAnswerValidation = [
  body('content')
    .trim()
    .isLength({ min: 20 })
    .withMessage('Answer must be at least 20 characters')
];

// @route   GET /api/answers
// @desc    Get answers for a question
// @access  Public
router.get('/', [
  query('questionId').isMongoId().withMessage('Valid question ID is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('sort').optional().isIn(['newest', 'oldest', 'votes']).withMessage('Invalid sort option')
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
      questionId,
      page = 1,
      limit = 20,
      sort = 'votes'
    } = req.query;

    // Check if question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      default: // votes
        sortOption = { isAccepted: -1, votes: -1, createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Get answers
    const [answers, total] = await Promise.all([
      Answer.find({ question: questionId, isDeleted: false })
        .populate('author', 'username avatar reputation role createdAt')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit)),
      Answer.countDocuments({ question: questionId, isDeleted: false })
    ]);

    res.json({
      success: true,
      data: answers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalAnswers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get answers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching answers'
    });
  }
});

// @route   GET /api/answers/:id
// @desc    Get single answer by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id)
      .populate('author', 'username avatar reputation role createdAt')
      .populate('question', 'title author')
      .populate('comments.author', 'username avatar');

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    res.json({
      success: true,
      data: answer
    });

  } catch (error) {
    console.error('Get answer error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching answer'
    });
  }
});

// @route   POST /api/answers
// @desc    Create a new answer
// @access  Private
router.post('/', authenticate, answerCreateRateLimit, createAnswerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let { content, questionId } = req.body;

    // Check if question exists and is not closed
    const question = await Question.findById(questionId).populate('author');
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (question.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot answer a closed question'
      });
    }

    // Sanitize HTML content
    content = sanitizeHtml(content, sanitizeOptions);

    // Create answer
    const answer = new Answer({
      content,
      question: questionId,
      author: req.user._id
    });

    await answer.save();

    // Add answer to question's answers array
    await Question.findByIdAndUpdate(questionId, {
      $push: { answers: answer._id },
      $set: { 
        isAnswered: true,
        lastActivity: new Date(),
        lastActivityBy: req.user._id
      }
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.answersGiven': 1 }
    });

    // Create notification for question author
    if (question.author._id.toString() !== req.user._id.toString()) {
      await Notification.notifyAnswer(
        question.author._id,
        req.user._id,
        question
      );
    }

    // Populate author info
    await answer.populate('author', 'username avatar reputation');

    res.status(201).json({
      success: true,
      message: 'Answer created successfully',
      data: answer
    });

  } catch (error) {
    console.error('Create answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating answer'
    });
  }
});

// @route   PUT /api/answers/:id
// @desc    Update an answer
// @access  Private (Author or Moderator)
router.put('/:id', authenticate, updateAnswerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const answer = await Answer.findById(req.params.id);

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check ownership or moderator status
    req.resource = answer;
    const ownershipCheck = requireOwnershipOrModerator();
    await new Promise((resolve, reject) => {
      ownershipCheck(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    let { content } = req.body;

    // Sanitize HTML content
    content = sanitizeHtml(content, sanitizeOptions);

    // Add to edit history if content changed
    if (content !== answer.content) {
      await answer.addToEditHistory(answer.content, req.user._id, 'Content updated');
    }

    // Update answer
    const updatedAnswer = await Answer.findByIdAndUpdate(
      req.params.id,
      { content },
      { new: true, runValidators: true }
    ).populate('author', 'username avatar reputation');

    // Update question's last activity
    await Question.findByIdAndUpdate(answer.question, {
      lastActivity: new Date(),
      lastActivityBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Answer updated successfully',
      data: updatedAnswer
    });

  } catch (error) {
    console.error('Update answer error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating answer'
    });
  }
});

// @route   DELETE /api/answers/:id
// @desc    Delete an answer (soft delete)
// @access  Private (Author or Moderator)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check ownership or moderator status
    req.resource = answer;
    const ownershipCheck = requireOwnershipOrModerator();
    await new Promise((resolve, reject) => {
      ownershipCheck(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Soft delete the answer
    await Answer.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user._id
    });

    // Remove answer from question's answers array and update status
    const question = await Question.findById(answer.question);
    question.answers = question.answers.filter(id => !id.equals(req.params.id));
    
    // Check if question still has answers
    const remainingAnswers = await Answer.countDocuments({ 
      question: answer.question, 
      isDeleted: false 
    });
    
    if (remainingAnswers === 0) {
      question.isAnswered = false;
    }

    // If this was the accepted answer, unaccept it
    if (question.acceptedAnswer && question.acceptedAnswer.equals(req.params.id)) {
      question.acceptedAnswer = null;
    }

    await question.save();

    // Update user stats
    await User.findByIdAndUpdate(answer.author, {
      $inc: { 'stats.answersGiven': -1 }
    });

    res.json({
      success: true,
      message: 'Answer deleted successfully'
    });

  } catch (error) {
    console.error('Delete answer error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while deleting answer'
    });
  }
});

// @route   POST /api/answers/:id/vote
// @desc    Vote on an answer
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
    const answer = await Answer.findById(req.params.id).populate('author');

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Users cannot vote on their own answers
    if (answer.author._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot vote on your own answer'
      });
    }

    // Apply vote
    if (type === 'upvote') {
      await answer.addUpvote(req.user._id);
      
      // Create notification for upvote
      await Notification.notifyUpvote(
        answer.author._id,
        req.user._id,
        answer,
        'answer'
      );
      
      // Update author reputation (+10 for answer upvote)
      await answer.author.updateReputation(10);
    } else {
      await answer.addDownvote(req.user._id);
      
      // Update author reputation (-2 for answer downvote)
      await answer.author.updateReputation(-2);
    }

    res.json({
      success: true,
      message: `${type} recorded successfully`,
      votes: answer.votes
    });

  } catch (error) {
    console.error('Vote answer error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while voting'
    });
  }
});

// @route   POST /api/answers/:id/accept
// @desc    Accept an answer as the solution
// @access  Private (Question Author only)
router.post('/:id/accept', authenticate, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id).populate('author');

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    const question = await Question.findById(answer.question);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Only question author can accept answers
    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the question author can accept answers'
      });
    }

    // If there's already an accepted answer, unaccept it
    if (question.acceptedAnswer) {
      await Answer.findByIdAndUpdate(question.acceptedAnswer, {
        isAccepted: false,
        acceptedAt: null
      });
    }

    // Accept this answer
    await answer.accept();
    
    // Update question
    question.acceptedAnswer = answer._id;
    await question.save();

    // Create notification for answer author
    if (answer.author._id.toString() !== req.user._id.toString()) {
      await Notification.notifyAcceptedAnswer(
        answer.author._id,
        req.user._id,
        answer
      );
    }

    // Update answer author reputation (+15 for accepted answer)
    await answer.author.updateReputation(15);

    res.json({
      success: true,
      message: 'Answer accepted successfully'
    });

  } catch (error) {
    console.error('Accept answer error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while accepting answer'
    });
  }
});

// @route   POST /api/answers/:id/comments
// @desc    Add a comment to an answer
// @access  Private
router.post('/:id/comments', authenticate, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
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

    const { content } = req.body;
    const answer = await Answer.findById(req.params.id);

    if (!answer || answer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Add comment
    await answer.addComment(content, req.user._id);
    
    // Populate the new comment
    await answer.populate('comments.author', 'username avatar');

    // Get the newly added comment
    const newComment = answer.comments[answer.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: newComment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while adding comment'
    });
  }
});

module.exports = router;
