const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Message = require('../../models/Message');
const User = require('../../models/User');

// @route   GET api/messages
// @desc    Get all messages
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Fetch messages and sort by most recent
    const messages = await Message.find().sort({ timestamp: -1 });
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/messages
// @desc    Create a message
// @access  Private (Admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admins only.' });
  }

  const { content, messageType, fileUrl } = req.body;

  try {
    const user = await User.findById(req.user.id).select('-password');

    const newMessage = new Message({
      content,
      messageType,
      fileUrl,
      sender: req.user.id,
      senderUsername: user.username
    });

    const message = await newMessage.save();
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/messages/:id
// @desc    Update (edit) a message
// @access  Private (Admin only)
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied. Admins only.' });
  }
  
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }
    // Ensure the user editing is the one who sent it (or is an admin)
    if (message.sender.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
    }
    
    message.content = req.body.content;
    message.isEdited = true;
    
    await message.save();
    res.json(message);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// @route   DELETE api/messages/:id
// @desc    Delete a message
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }

    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }
        if (message.sender.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        
        await message.remove();
        res.json({ msg: 'Message removed' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;