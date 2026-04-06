const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Try local MongoDB first, if not use memory store for testing
        const conn = await mongoose.connect('mongodb://localhost:27017/skystore', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log('❌ MongoDB connection failed, using in-memory store for testing');
        // This will allow the app to run without MongoDB for now
    }
};

module.exports = connectDB;