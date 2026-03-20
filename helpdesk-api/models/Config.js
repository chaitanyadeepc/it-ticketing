const mongoose = require('mongoose');

// Generic key-value config store — used for SLA thresholds, etc.
const configSchema = new mongoose.Schema(
  {
    key:       { type: String, required: true, unique: true },
    value:     { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Config', configSchema);
