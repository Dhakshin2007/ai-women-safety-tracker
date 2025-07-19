// backend/models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  // In a real app, you would hash and salt passwords.
  // password: { type: String, required: true }, 
  favoriteContacts: {
    type: [String],
    required: true,
    validate: [v => v.length > 0, 'At least one favorite contact is required.']
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);