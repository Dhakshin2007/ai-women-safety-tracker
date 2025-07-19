// backend/routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');

// SIGNUP / LOGIN (simplified for this example)
// In a real app, you'd have separate /login and /signup routes with password checks.
router.post('/auth', async (req, res) => {
  const { email, name, favoriteContacts } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    let user = await User.findOne({ email });

    // If user exists, it's a login. If not, it's a signup.
    if (user) {
      // Login successful
      res.json(user);
    } else {
      // Signup: Check for required fields
      if (!name || !favoriteContacts || favoriteContacts.length === 0) {
        return res.status(400).json({ message: 'Name and at least one contact are required for signup.' });
      }
      // Create new user
      user = new User({ name, email, favoriteContacts });
      await user.save();
      res.status(201).json(user);
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
});

module.exports = router;