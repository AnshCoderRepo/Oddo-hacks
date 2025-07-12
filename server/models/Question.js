const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Question title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Question content is required'],
    minlength: [30, 'Content must be at least 30 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  votes: {
    type: Number,
    default: 0
  },
  upvotes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  downvotes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  answers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  }],
  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer',
    default: null
  },
  isAnswered: {
    type: Boolean,
    default: false
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  closedReason: {
    type: String,
    enum: ['duplicate', 'off-topic', 'too-broad', 'unclear', 'spam'],
    default: null
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  lastActivityBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  featured: {
    type: Boolean,
    default: false
  },
  bounty: {
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Bounty amount cannot be negative']
    },
    offeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    expiresAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for answer count
questionSchema.virtual('answerCount').get(function() {
  return this.answers ? this.answers.length : 0;
});

// Virtual for net votes
questionSchema.virtual('netVotes').get(function() {
  return (this.upvotes ? this.upvotes.length : 0) - (this.downvotes ? this.downvotes.length : 0);
});

// Indexes for better query performance
questionSchema.index({ author: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ votes: -1 });
questionSchema.index({ views: -1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ lastActivity: -1 });
questionSchema.index({ isAnswered: 1 });
questionSchema.index({ featured: 1 });
questionSchema.index({ title: 'text', content: 'text' });

// Middleware to update votes count
questionSchema.pre('save', function(next) {
  this.votes = (this.upvotes ? this.upvotes.length : 0) - (this.downvotes ? this.downvotes.length : 0);
  next();
});

// Method to add upvote
questionSchema.methods.addUpvote = function(userId) {
  // Remove any existing downvote from this user
  this.downvotes = this.downvotes.filter(vote => !vote.user.equals(userId));
  
  // Check if user already upvoted
  const existingUpvote = this.upvotes.find(vote => vote.user.equals(userId));
  if (existingUpvote) {
    // Remove upvote (toggle off)
    this.upvotes = this.upvotes.filter(vote => !vote.user.equals(userId));
  } else {
    // Add upvote
    this.upvotes.push({ user: userId });
  }
  
  this.votes = this.upvotes.length - this.downvotes.length;
  return this.save();
};

// Method to add downvote
questionSchema.methods.addDownvote = function(userId) {
  // Remove any existing upvote from this user
  this.upvotes = this.upvotes.filter(vote => !vote.user.equals(userId));
  
  // Check if user already downvoted
  const existingDownvote = this.downvotes.find(vote => vote.user.equals(userId));
  if (existingDownvote) {
    // Remove downvote (toggle off)
    this.downvotes = this.downvotes.filter(vote => !vote.user.equals(userId));
  } else {
    // Add downvote
    this.downvotes.push({ user: userId });
  }
  
  this.votes = this.upvotes.length - this.downvotes.length;
  return this.save();
};

// Method to add view
questionSchema.methods.addView = function(userId) {
  // Only count unique views per user
  if (userId && !this.viewedBy.some(view => view.user.equals(userId))) {
    this.viewedBy.push({ user: userId });
  }
  this.views = this.viewedBy.length;
  return this.save();
};

// Method to update last activity
questionSchema.methods.updateLastActivity = function(userId) {
  this.lastActivity = new Date();
  if (userId) {
    this.lastActivityBy = userId;
  }
  return this.save();
};

module.exports = mongoose.model('Question', questionSchema);
