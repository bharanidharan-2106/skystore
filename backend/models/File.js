// backend/models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    s3Key: { type: String, required: true },
    s3Url: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    isProtected: { type: Boolean, default: false },
    password: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);