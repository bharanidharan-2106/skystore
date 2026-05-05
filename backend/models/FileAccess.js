const mongoose = require('mongoose');

const fileAccessSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fileId: {
        type: String,
        required: true,
        index: true
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user only has one access record per file
fileAccessSchema.index({ userId: 1, fileId: 1 }, { unique: true });

module.exports = mongoose.model('FileAccess', fileAccessSchema);
