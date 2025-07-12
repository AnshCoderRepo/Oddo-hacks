const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Tag = require('../models/Tag');
const Question = require('../models/Question');
const { 
  authenticate, 
  optionalAuth, 
  requireModerator,
  updateLastActive
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createTagValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Tag name must be between 2 and 30 characters')
    .matches(/^[a-z0-9-+#.]+$/)
    .withMessage('Tag name can only contain lowercase letters, numbers, hyphens, plus signs, dots, and hash symbols'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex code')
];

const updateTagValidation = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex code'),
  body('synonyms')
    .optional()
    .isArray()
    .withMessage('Synonyms must be an array')
    .custom((synonyms) => {
      if (!synonyms.every(synonym => typeof synonym === 'string' && synonym.length <= 30)) {
        throw new Error('Each synonym must be a string with max 30 characters');
      }
      return true;
    })
];

// @route   GET /api/tags
// @desc    Get all tags with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort').optional().isIn(['popular', 'name', 'newest', 'activity']).withMessage('Invalid sort option'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('official').optional().isBoolean().withMessage('Official must be a boolean')
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
      limit = 50,
      sort = 'popular',
      search,
      official
    } = req.query;

    // Build query
    const query = { isDeprecated: false };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { synonyms: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (official !== undefined) {
      query.isOfficial = official === 'true';
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'name':
        sortOption = { name: 1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'activity':
        sortOption = { lastUsed: -1 };
        break;
      default: // popular
        sortOption = { 'usage.questionCount': -1, 'usage.weeklyQuestions': -1 };
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [tags, total] = await Promise.all([
      Tag.find(query)
        .populate('createdBy', 'username')
        .populate('parentTag', 'name')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Tag.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: tags,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTags: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tags'
    });
  }
});

// @route   GET /api/tags/popular
// @desc    Get popular tags
// @access  Public
router.get('/popular', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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

    const { limit = 20 } = req.query;

    const tags = await Tag.getPopularTags(parseInt(limit));

    res.json({
      success: true,
      data: tags
    });

  } catch (error) {
    console.error('Get popular tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching popular tags'
    });
  }
});

// @route   GET /api/tags/search
// @desc    Search tags
// @access  Public
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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

    const { q, limit = 10 } = req.query;

    const tags = await Tag.searchTags(q, parseInt(limit));

    res.json({
      success: true,
      data: tags
    });

  } catch (error) {
    console.error('Search tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching tags'
    });
  }
});

// @route   GET /api/tags/:id
// @desc    Get single tag by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id)
      .populate('createdBy', 'username avatar reputation')
      .populate('parentTag', 'name description')
      .populate('childTags', 'name description usage.questionCount')
      .populate('relatedTags.tag', 'name description usage.questionCount')
      .populate('moderators', 'username avatar reputation');

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Get recent questions with this tag
    const recentQuestions = await Question.find({ 
      tags: tag.name,
      isClosed: false
    })
    .populate('author', 'username avatar reputation')
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title votes views answers createdAt');

    res.json({
      success: true,
      data: {
        ...tag.toObject(),
        recentQuestions
      }
    });

  } catch (error) {
    console.error('Get tag error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tag'
    });
  }
});

// @route   GET /api/tags/:name/questions
// @desc    Get questions for a specific tag
// @access  Public
router.get('/:name/questions', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('sort').optional().isIn(['newest', 'votes', 'activity']).withMessage('Invalid sort option')
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

    const {
      page = 1,
      limit = 20,
      sort = 'newest'
    } = req.query;

    const { name } = req.params;

    // Check if tag exists
    const tag = await Tag.findOne({ name: name.toLowerCase() });
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'votes':
        sortOption = { votes: -1, createdAt: -1 };
        break;
      case 'activity':
        sortOption = { lastActivity: -1 };
        break;
      default: // newest
        sortOption = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Get questions
    const [questions, total] = await Promise.all([
      Question.find({ 
        tags: name.toLowerCase(),
        isClosed: false
      })
      .populate('author', 'username avatar reputation')
      .populate('lastActivityBy', 'username')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit)),
      Question.countDocuments({ 
        tags: name.toLowerCase(),
        isClosed: false
      })
    ]);

    res.json({
      success: true,
      data: questions,
      tag: {
        name: tag.name,
        description: tag.description,
        questionCount: tag.usage.questionCount
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalQuestions: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get tag questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tag questions'
    });
  }
});

// @route   POST /api/tags
// @desc    Create a new tag
// @access  Private (Moderator+)
router.post('/', authenticate, requireModerator, createTagValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, color, icon } = req.body;

    // Check if tag already exists
    const existingTag = await Tag.findOne({ name: name.toLowerCase() });
    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag with this name already exists'
      });
    }

    // Create tag
    const tag = new Tag({
      name: name.toLowerCase(),
      description,
      color,
      icon,
      createdBy: req.user._id,
      isOfficial: true // Official tags created by moderators
    });

    await tag.save();

    // Populate creator info
    await tag.populate('createdBy', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      data: tag
    });

  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating tag'
    });
  }
});

// @route   PUT /api/tags/:id
// @desc    Update a tag
// @access  Private (Moderator+)
router.put('/:id', authenticate, requireModerator, updateTagValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { description, color, synonyms, isOfficial, isDeprecated, deprecationMessage } = req.body;

    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Update fields
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (synonyms !== undefined) updateData.synonyms = synonyms;
    if (isOfficial !== undefined) updateData.isOfficial = isOfficial;
    if (isDeprecated !== undefined) updateData.isDeprecated = isDeprecated;
    if (deprecationMessage !== undefined) updateData.deprecationMessage = deprecationMessage;

    // Update wiki if provided
    if (req.body.wiki) {
      updateData.wiki = {
        ...tag.wiki,
        ...req.body.wiki,
        lastEditedBy: req.user._id,
        lastEditedAt: new Date()
      };
    }

    const updatedTag = await Tag.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username avatar');

    res.json({
      success: true,
      message: 'Tag updated successfully',
      data: updatedTag
    });

  } catch (error) {
    console.error('Update tag error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating tag'
    });
  }
});

// @route   DELETE /api/tags/:id
// @desc    Delete a tag (mark as deprecated)
// @access  Private (Moderator+)
router.delete('/:id', authenticate, requireModerator, async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Don't actually delete, just mark as deprecated
    const updatedTag = await Tag.findByIdAndUpdate(
      req.params.id,
      { 
        isDeprecated: true,
        deprecationMessage: 'This tag has been deprecated by moderators.'
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Tag marked as deprecated successfully',
      data: updatedTag
    });

  } catch (error) {
    console.error('Deprecate tag error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while deprecating tag'
    });
  }
});

// @route   POST /api/tags/:id/related
// @desc    Add related tag
// @access  Private (Moderator+)
router.post('/:id/related', authenticate, requireModerator, [
  body('tagId').isMongoId().withMessage('Valid tag ID is required'),
  body('strength').optional().isFloat({ min: 0, max: 1 }).withMessage('Strength must be between 0 and 1')
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

    const { tagId, strength = 0.5 } = req.body;

    const [tag, relatedTag] = await Promise.all([
      Tag.findById(req.params.id),
      Tag.findById(tagId)
    ]);

    if (!tag || !relatedTag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Add relationship both ways
    await Promise.all([
      tag.addRelatedTag(tagId, strength),
      relatedTag.addRelatedTag(req.params.id, strength)
    ]);

    res.json({
      success: true,
      message: 'Related tag added successfully'
    });

  } catch (error) {
    console.error('Add related tag error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding related tag'
    });
  }
});

module.exports = router;
