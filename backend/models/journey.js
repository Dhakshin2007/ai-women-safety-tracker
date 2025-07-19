// backend/models/journey.js
const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
  // Link to the User model
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  from: String,
  to: String,
  startTime: { type: Date, default: Date.now },
  checkIns: [Date],
  status: { type: String, default: 'ongoing' },
  locationUpdates: [{
    lat: Number,
    lon: Number,
    time: Date
  }]
});

module.exports = mongoose.model('Journey', journeySchema);