const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/sharing', require('./routes/sharing')); // ✅ ADDED SHARING ROUTE

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'SkyStore Server is running!',
        timestamp: new Date().toISOString()
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skystore', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 SkyStore Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📍 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`📍 Sharing endpoint: http://localhost:${PORT}/api/sharing`); // ✅ ADDED THIS LINE
});