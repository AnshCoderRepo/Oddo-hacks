const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Answer content is required'],
    minlength: [20, 'Answer must be at least 20 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
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
  isAccepted: {
    type: Boolean,
    default: false
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  comments: [{
    content: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  editHistory: [{
    content: String,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    editedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for net votes
answerSchema.virtual('netVotes').get(function() {
  return (this.upvotes ? this.upvotes.length : 0) - (this.downvotes ? this.downvotes.length : 0);
});

// Virtual for comment count
answerSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Indexes for better query performance
answerSchema.index({ author: 1 });
answerSchema.index({ question: 1 });
answerSchema.index({ votes: -1 });
answerSchema.index({ createdAt: -1 });
answerSchema.index({ isAccepted: 1 });
answerSchema.index({ isDeleted: 1 });

// Middleware to update votes count
answerSchema.pre('save', function(next) {
  this.votes = (this.upvotes ? this.upvotes.length : 0) - (this.downvotes ? this.downvotes.length : 0);
  next();
});

// Method to add upvote
answerSchema.methods.addUpvote = function(userId) {
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
answerSchema.methods.addDownvote = function(userId) {
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

// Method to accept answer
answerSchema.methods.accept = function() {
  this.isAccepted = true;
  this.acceptedAt = new Date();
  return this.save();
};

// Method to add comment
answerSchema.methods.addComment = function(content, authorId) {
  this.comments.push({
    content,
    author: authorId
  });
  return this.save();
};

// Method to add to edit history
answerSchema.methods.addToEditHistory = function(oldContent, editorId, reason) {
  this.editHistory.push({
    content: oldContent,
    editedBy: editorId,
    reason: reason || 'Content updated'
  });
  return this.save();
};

module.exports = mongoose.model('Answer', answerSchema);
