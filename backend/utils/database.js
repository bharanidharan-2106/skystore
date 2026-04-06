const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // For now, we'll use local MongoDB. Later we'll switch to AWS
        const conn = await mongoose.connect('mongodb://localhost:27017/skystore', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;