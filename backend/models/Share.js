const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
    shareToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    fileId: {
        type: String,
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    permission: {
        type: String,
        enum: ['view_only', 'view_download'],
        default: 'view_only'
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index - MongoDB will automatically delete expired shares
    },
    isPasswordProtected: {
        type: Boolean,
        default: false
    },
    password: {
        type: String, // Hashed
        default: null
    },
    accessCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ShareLink', shareSchema);
