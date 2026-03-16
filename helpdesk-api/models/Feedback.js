const mongoose = require('mongoose');

const VALID_PRIORITIES = ['speed', 'tracking', 'ai', 'mobile', 'notes', 'availability'];

const FeedbackSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['student', 'it_staff', 'faculty', 'developer', 'manager', 'other'],
      required: true,
    },
    currentProcess: {
      type: String,
      enum: ['email', 'phone', 'walkin', 'portal', 'chat', 'none'],
      required: true,
    },
    satisfaction: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    priorities: {
      type: [String],
      validate: {
        validator(v) {
          return (
            Array.isArray(v) &&
            v.length >= 1 &&
            v.length <= 3 &&
            v.every((p) => VALID_PRIORITIES.includes(p))
          );
        },
        message: 'Select 1–3 valid priorities',
      },
    },
    wouldUseChatbot: {
      type: String,
      enum: ['definitely', 'probably', 'maybe', 'no'],
      required: true,
    },
    issueFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'rarely'],
      required: true,
    },
    statusImportance: {
      type: String,
      enum: ['critical', 'important', 'somewhat', 'notimportant'],
      required: true,
    },
    suggestions: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    userAgent: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

FeedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
