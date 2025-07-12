const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  content: { type: String, required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isAccepted: { type: Boolean, default: false },
  votes: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      vote: { type: String, enum: ['up', 'down'] }, // 'up' or 'down'
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('Answer', answerSchema);