const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const connectDB = require('./config/db');
const cors = require('cors');
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/messages', require('./routes/api/messages'));

// Initialize Express app
const app = express();

// Create an HTTP server from the Express app
const server = http.createServer(app);

// Initialize Socket.io server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity. In production, restrict this.
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Connect to the MongoDB database
connectDB();

// --- Middleware ---
// Enable Cross-Origin Resource Sharing
app.use(cors());
// Enable Express to parse JSON request bodies
app.use(express.json({ extended: false }));

// --- API Routes ---
app.get('/', (req, res) => res.send('API is running...'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/messages', require('./routes/api/messages'));

// --- Socket.io Connection Handling ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for new messages from a client
  socket.on('sendMessage', (message) => {
    console.log('Message received:', message);
    // Broadcast the new message to all connected clients
    io.emit('receiveMessage', message);
  });
  
  // Listen for a message edit event
  socket.on('editMessage', (message) => {
    console.log('Message edited:', message);
    io.emit('messageEdited', message);
  });
  
  // Listen for a message delete event
  socket.on('deleteMessage', (messageId) => {
    console.log('Message deleted:', messageId);
    io.emit('messageDeleted', messageId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


// Define the port to run the server on
const PORT = process.env.PORT || 5000;

// Start the server
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
