const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  createdBy: {
    type: String,
    required: true,
    trim: true,
  },
  members: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Group', GroupSchema);
