const mongoose = require('mongoose');

const maintenanceWindowSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  message:     { type: String, default: 'The system is currently undergoing scheduled maintenance. Please check back later.' },
  startAt:     { type: Date, required: true },
  endAt:       { type: Date, required: true },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MaintenanceWindow', maintenanceWindowSchema);
