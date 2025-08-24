const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Message = require('../../models/Message');
const User = require('../../models/User');

// GET all messages (public)
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: -1 });
    res.json(messages);
  } catch (err) {
    console.error('GET /messages error:', err.message);
    res.status(500).send('Server Error');
  }
});

// POST a new message (admin only)
router.post('/', auth, async (req, res) => {
  try {
    console.log('POST /messages req.user:', req.user);
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }

    const { content, messageType, fileUrl } = req.body;
    if (!content && messageType !== 'image' && messageType !== 'file' && messageType !== 'poll') {
      return res.status(400).json({ msg: 'Message content is required.' });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(400).json({ msg: 'User not found.' });
    }

    const newMessage = new Message({
      content: content || '',
      messageType: messageType || 'text',
      fileUrl: fileUrl || '',
      sender: req.user.id,
      senderUsername: user.username
    });

    const message = await newMessage.save();
    console.log('Message saved:', message);
    res.json(message);
  } catch (err) {
    console.error('POST /messages error:', err.message);
    res.status(500).send('Server Error');
  }
});

// PUT (edit) a message
router.put('/:id', auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ msg: 'Message not found.' });

    if (message.sender.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized.' });
    }

    message.content = req.body.content || message.content;
    message.isEdited = true;
    await message.save();

    res.json(message);
  } catch (err) {
    console.error('PUT /messages/:id error:', err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE a message
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ msg: 'Message not found.' });

    if (message.sender.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized.' });
    }

    await message.remove();
    res.json({ msg: 'Message removed' });
  } catch (err) {
    console.error('DELETE /messages/:id error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
