// server.js

// --- Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs'); // Added for file system operations

// --- Initializations ---
const app = express();
const port = process.env.PORT || 3000;
const SECRET_KEY = 'your_secret_key'; // Use a more secure key in production

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MongoDB Connection ---
mongoose.connect('mongodb+srv://avstechmech:avstechmechhusain@vgrow.8vkww87.mongodb.net/?retryWrites=true&w=majority&appName=vgrow')
    .then(() => console.log("MongoDB connected successfully."))
    .catch(err => console.error("MongoDB connection error:", err));

// --- MongoDB Schemas ---
const messageSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'text', 'image', 'file'
    content: { type: String, required: true }, // text message or file path
    filename: { type: String }, // Original filename for file/image
    timestamp: { type: Date, default: Date.now },
    sender: { type: String, default: 'admin' }
});
const Message = mongoose.model('Message', messageSchema);

const pollSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{
        text: String,
        votes: { type: Number, default: 0 }
    }],
    timestamp: { type: Date, default: Date.now }
});
const Poll = mongoose.model('Poll', pollSchema);

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// --- JWT Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- API Routes ---

// 1. Admin Login
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'avstechmech' && password === 'avstechmech') {
        const accessToken = jwt.sign({ name: username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ accessToken });
    } else {
        res.status(401).send('Invalid credentials');
    }
});

// 2. Send a Message (Admin Only)
app.post('/messages', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { type, content } = req.body;
        let newMessage;
        if (type === 'text') {
            newMessage = new Message({ type: 'text', content });
        } else if (req.file) {
            newMessage = new Message({
                type,
                content: `/uploads/${req.file.filename}`,
                filename: req.file.originalname
            });
        } else {
            return res.status(400).send('File or content is required.');
        }
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// 3. Get All Messages
app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 'asc' });
        res.json(messages);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// 4. Create a new Poll (Admin only)
app.post('/polls', authenticateToken, async (req, res) => {
    try {
        const { question, options } = req.body;
        if (!question || !options || !Array.isArray(options) || options.length < 2) {
            return res.status(400).send('Poll must have a question and at least two options.');
        }
        const newPoll = new Poll({
            question,
            options: options.map(opt => ({ text: opt, votes: 0 }))
        });
        await newPoll.save();
        res.status(201).json(newPoll);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// 5. Get all Polls
app.get('/polls', async (req, res) => {
    try {
        const polls = await Poll.find().sort({ timestamp: 'asc' });
        res.json(polls);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// 6. Vote on a Poll
app.post('/polls/:id/vote', async (req, res) => {
    try {
        const { optionIndex } = req.body;
        const poll = await Poll.findById(req.params.id);
        if (!poll) return res.status(404).send('Poll not found.');
        if (optionIndex == null || optionIndex < 0 || optionIndex >= poll.options.length) {
            return res.status(400).send('Invalid option index.');
        }
        poll.options[optionIndex].votes += 1;
        await poll.save();
        res.status(200).json(poll);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// 7. Delete a Message (Admin only)
app.delete('/messages/:id', authenticateToken, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).send('Message not found.');
        }

        // Optional: If it's a file or image, delete it from the server's file system
        if (message.type !== 'text' && message.content) {
            const filePath = path.join(__dirname, message.content);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Message.findByIdAndDelete(req.params.id);
        res.status(200).send('Message deleted successfully');
    } catch (error) {
        console.error("Error deleting message:", error);
        res.status(500).send('Server error');
    }
});

// 8. Edit a Message (Admin only)
app.put('/messages/:id', authenticateToken, async (req, res) => {
    try {
        const { newContent } = req.body;
        if (!newContent) {
            return res.status(400).send('New content is required.');
        }

        // Find the message and update its content
        const updatedMessage = await Message.findByIdAndUpdate(
            req.params.id,
            { content: newContent },
            { new: true } // This option returns the updated document
        );

        if (!updatedMessage) {
            return res.status(404).send('Message not found.');
        }

        res.status(200).json(updatedMessage);
    } catch (error) {
        console.error("Error editing message:", error);
        res.status(500).send('Server error');
    }
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
