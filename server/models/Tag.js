const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [2, 'Tag name must be at least 2 characters'],
    maxlength: [30, 'Tag name cannot exceed 30 characters'],
    match: [/^[a-z0-9-+#.]+$/, 'Tag name can only contain lowercase letters, numbers, hyphens, plus signs, dots, and hash symbols']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  color: {
    type: String,
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code'],
    default: '#3b82f6'
  },
  icon: {
    type: String,
    default: null
  },
  usage: {
    questionCount: {
      type: Number,
      default: 0,
      min: [0, 'Question count cannot be negative']
    },
    totalViews: {
      type: Number,
      default: 0,
      min: [0, 'Total views cannot be negative']
    },
    weeklyQuestions: {
      type: Number,
      default: 0,
      min: [0, 'Weekly questions cannot be negative']
    }
  },
  synonyms: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Synonym cannot exceed 30 characters']
  }],
  parentTag: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
    default: null
  },
  childTags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  relatedTags: [{
    tag: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tag'
    },
    strength: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  }],
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isOfficial: {
    type: Boolean,
    default: false
  },
  isDeprecated: {
    type: Boolean,
    default: false
  },
  deprecationMessage: {
    type: String,
    default: null
  },
  wiki: {
    excerpt: {
      type: String,
      maxlength: [200, 'Wiki excerpt cannot exceed 200 characters'],
      default: ''
    },
    content: {
      type: String,
      maxlength: [10000, 'Wiki content cannot exceed 10000 characters'],
      default: ''
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastEditedAt: {
      type: Date,
      default: null
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for popularity score
tagSchema.virtual('popularityScore').get(function() {
  const questionWeight = 1;
  const viewWeight = 0.01;
  const weeklyWeight = 2;
  
  return (this.usage.questionCount * questionWeight) + 
         (this.usage.totalViews * viewWeight) + 
         (this.usage.weeklyQuestions * weeklyWeight);
});

// Virtual for tag URL slug
tagSchema.virtual('slug').get(function() {
  return this.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
});

// Indexes for better query performance
tagSchema.index({ name: 1 });
tagSchema.index({ 'usage.questionCount': -1 });
tagSchema.index({ 'usage.weeklyQuestions': -1 });
tagSchema.index({ popularityScore: -1 });
tagSchema.index({ createdAt: -1 });
tagSchema.index({ lastUsed: -1 });
tagSchema.index({ isOfficial: 1 });
tagSchema.index({ isDeprecated: 1 });

// Text index for search
tagSchema.index({ 
  name: 'text', 
  description: 'text', 
  'wiki.excerpt': 'text',
  synonyms: 'text'
});

// Method to increment usage
tagSchema.methods.incrementUsage = function() {
  this.usage.questionCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Method to decrement usage
tagSchema.methods.decrementUsage = function() {
  this.usage.questionCount = Math.max(0, this.usage.questionCount - 1);
  return this.save();
};

// Method to add views
tagSchema.methods.addViews = function(count = 1) {
  this.usage.totalViews += count;
  return this.save();
};

// Method to update weekly questions
tagSchema.methods.updateWeeklyQuestions = function() {
  // This would typically be called by a scheduled job
  // For now, we'll implement a simple version
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // In a real implementation, you'd query the Question collection
  // to count questions with this tag from the last week
  return this.save();
};

// Method to add related tag
tagSchema.methods.addRelatedTag = function(tagId, strength = 0.1) {
  const existingRelation = this.relatedTags.find(rel => rel.tag.equals(tagId));
  
  if (existingRelation) {
    existingRelation.strength = Math.min(1, existingRelation.strength + strength);
  } else {
    this.relatedTags.push({ tag: tagId, strength });
  }
  
  return this.save();
};

// Static method to find or create tag
tagSchema.statics.findOrCreate = async function(tagName, createdBy) {
  const normalizedName = tagName.toLowerCase().trim();
  
  let tag = await this.findOne({ name: normalizedName });
  
  if (!tag) {
    tag = new this({
      name: normalizedName,
      createdBy: createdBy
    });
    await tag.save();
  }
  
  return tag;
};

// Static method to get popular tags
tagSchema.statics.getPopularTags = function(limit = 20) {
  return this.find({ isDeprecated: false })
    .sort({ 'usage.questionCount': -1 })
    .limit(limit)
    .populate('createdBy', 'username');
};

// Static method to search tags
tagSchema.statics.searchTags = function(query, limit = 10) {
  return this.find({
    $and: [
      { isDeprecated: false },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { synonyms: { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  })
  .sort({ 'usage.questionCount': -1 })
  .limit(limit);
};

module.exports = mongoose.model('Tag', tagSchema);
