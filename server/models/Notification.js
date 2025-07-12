const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'answer',          // Someone answered your question
      'comment',         // Someone commented on your post
      'upvote',          // Someone upvoted your content
      'downvote',        // Someone downvoted your content
      'accept',          // Your answer was accepted
      'mention',         // You were mentioned in a post
      'follow',          // Someone followed you
      'badge',           // You earned a badge
      'bounty',          // Bounty related notification
      'system',          // System notification
      'moderation'       // Moderation action
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  relatedQuestion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    default: null
  },
  relatedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer',
    default: null
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actionUrl: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ sender: 1 });
notificationSchema.index({ relatedQuestion: 1 });
notificationSchema.index({ relatedAnswer: 1 });
notificationSchema.index({ isArchived: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for time since created
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInMs = now - this.createdAt;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${diffInDays}d ago`;
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to archive notification
notificationSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  // Don't create notification if sender and recipient are the same
  if (data.sender && data.recipient && data.sender.toString() === data.recipient.toString()) {
    return null;
  }
  
  const notification = new this(data);
  return await notification.save();
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isArchived: false
  });
};

// Static method to get notifications for user
notificationSchema.statics.getForUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    type = null
  } = options;
  
  const query = {
    recipient: userId,
    isArchived: false
  };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .populate('sender', 'username avatar')
    .populate('relatedQuestion', 'title')
    .populate('relatedAnswer', 'content')
    .populate('relatedUser', 'username avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsReadForUser = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { 
      isRead: true, 
      readAt: new Date() 
    }
  );
};

// Static method to clean up old notifications
notificationSchema.statics.cleanupOld = function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isArchived: true
  });
};

// Helper methods for creating specific notification types
notificationSchema.statics.notifyAnswer = function(questionAuthor, answerAuthor, question) {
  return this.createNotification({
    recipient: questionAuthor,
    sender: answerAuthor,
    type: 'answer',
    title: 'New Answer',
    message: `${answerAuthor.username} answered your question`,
    relatedQuestion: question._id,
    actionUrl: `/question/${question._id}`
  });
};

notificationSchema.statics.notifyUpvote = function(contentAuthor, voter, content, contentType) {
  return this.createNotification({
    recipient: contentAuthor,
    sender: voter,
    type: 'upvote',
    title: 'Upvote Received',
    message: `${voter.username} upvoted your ${contentType}`,
    relatedQuestion: contentType === 'question' ? content._id : content.question,
    relatedAnswer: contentType === 'answer' ? content._id : null,
    actionUrl: contentType === 'question' ? `/question/${content._id}` : `/question/${content.question}#answer-${content._id}`
  });
};

notificationSchema.statics.notifyAcceptedAnswer = function(answerAuthor, questionAuthor, answer) {
  return this.createNotification({
    recipient: answerAuthor,
    sender: questionAuthor,
    type: 'accept',
    title: 'Answer Accepted',
    message: `${questionAuthor.username} accepted your answer`,
    relatedAnswer: answer._id,
    relatedQuestion: answer.question,
    actionUrl: `/question/${answer.question}#answer-${answer._id}`
  });
};

notificationSchema.statics.notifyMention = function(mentionedUser, mentioner, content, contentType) {
  return this.createNotification({
    recipient: mentionedUser,
    sender: mentioner,
    type: 'mention',
    title: 'You were mentioned',
    message: `${mentioner.username} mentioned you in a ${contentType}`,
    relatedQuestion: contentType === 'question' ? content._id : content.question,
    relatedAnswer: contentType === 'answer' ? content._id : null,
    actionUrl: contentType === 'question' ? `/question/${content._id}` : `/question/${content.question}#answer-${content._id}`
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
