const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const ShareLink = require('../models/Share');
const FileAccess = require('../models/FileAccess');
const jwt = require('jsonwebtoken');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// In-memory mapping for verified session-level passwords
const filePasswords = new Map();

// Helper function to get content type based on file extension
function getContentType(extension) {
    const types = {
        'txt': 'text/plain',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg',
        'zip': 'application/zip'
    };
    return types[extension] || 'application/octet-stream';
}

// Generate share link
router.post('/share', auth, async (req, res) => {
    try {
        const { fileId, permission, expiresIn, password } = req.body;
        const user = req.user;
        
        const shareToken = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + (expiresIn || 7 * 24 * 60 * 60 * 1000)); 
        
        const share = new ShareLink({
            shareToken: shareToken,
            fileId: fileId,
            ownerId: user.id,
            permission: permission || 'view_only',
            expiresAt: expiresAt,
            isPasswordProtected: !!password,
            password: password ? crypto.createHash('sha256').update(password).digest('hex') : null
        });
        
        await share.save();
        
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        res.json({
            message: 'Share link created successfully',
            shareUrl: `${baseUrl}/share/${shareToken}`,
            shareToken: shareToken,
            expiresAt: expiresAt,
            isPasswordProtected: !!password
        });
        
    } catch (error) {
        console.error('Share creation error:', error);
        res.status(500).json({ error: 'Share creation failed' });
    }
});

// Get current user's shared files (Shared BY and Shared WITH them)
router.get('/my-shares', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Files shared BY this user
        const sharesByMe = await ShareLink.find({ 
            ownerId: userId, 
            expiresAt: { $gt: new Date() } 
        });
        const sharedByMeIds = sharesByMe.map(s => s.fileId.toString());
        
        // 2. Files shared WITH this user (recorded during access)
        const accessedRecords = await FileAccess.find({ userId: userId });
        const sharedWithMeIds = accessedRecords.map(r => r.fileId.toString());
        
        // Unique IDs across both
        const sharedFileIds = [...new Set([...sharedByMeIds, ...sharedWithMeIds])];
        
        res.json({ sharedFileIds });
    } catch (error) {
        console.error('Error fetching user shares:', error);
        res.status(500).json({ error: 'Failed to fetch shared files' });
    }
});

// Verify password for protected share
router.post('/verify-password/:shareToken', async (req, res) => {
    try {
        const { shareToken } = req.params;
        const { password } = req.body;
        
        const share = await ShareLink.findOne({ shareToken: shareToken });
        
        if (!share) return res.status(404).json({ error: 'Share link not found or expired' });
        if (new Date() > share.expiresAt) return res.status(410).json({ error: 'Share link has expired' });
        
        if (!share.isPasswordProtected) return res.json({ verified: true });
        
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        const isVerified = hashedPassword === share.password;
        
        if (isVerified) {
            filePasswords.set(shareToken, true);
        }
        
        res.json({ verified: isVerified });
    } catch (error) {
        console.error('Password verification error:', error);
        res.status(500).json({ error: 'Password verification failed' });
    }
});

// Access shared file and record for the user's dashboard if logged in
router.get('/access/:shareToken', async (req, res) => {
    try {
        const { shareToken } = req.params;
        const { password } = req.query;
        
        const share = await ShareLink.findOne({ shareToken: shareToken });
        if (!share) return res.status(404).json({ error: 'Share link not found or expired' });
        if (new Date() > share.expiresAt) return res.status(410).json({ error: 'Share link has expired' });

        // Handle password protection
        if (share.isPasswordProtected) {
            const isVerified = filePasswords.get(shareToken);
            if (!isVerified) {
                 if (!password) return res.status(401).json({ error: 'Password required', isPasswordProtected: true });
                 const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
                 if (hashedPassword !== share.password) return res.status(401).json({ error: 'Incorrect password' });
                 filePasswords.set(shareToken, true);
            }
        }

        // Record the access for the logged-in user
        const authHeader = req.header('Authorization');
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;
                
                await FileAccess.findOneAndUpdate(
                    { userId, fileId: share.fileId },
                    { lastAccessed: new Date() },
                    { upsert: true }
                );
            } catch (e) {
                // Token invalid - ignore
            }
        }

        share.accessCount++;
        await share.save();
        
        const { findFileById } = require('./files');
        const file = await findFileById(share.fileId, share.ownerId);

        if (!file) return res.status(404).json({ error: 'Original file not found' });

        res.json({ share, file });
    } catch (error) {
        console.error('Access share error:', error);
        res.status(500).json({ error: 'Failed to access share' });
    }
});

// Download shared file
router.get('/download/:shareToken', async (req, res) => {
    try {
        const { shareToken } = req.params;
        const { password } = req.query;
        
        const share = await ShareLink.findOne({ shareToken: shareToken });
        if (!share) return res.status(404).json({ error: 'Share link not found or expired' });
        if (new Date() > share.expiresAt) return res.status(410).json({ error: 'Share link has expired' });
        
        // Handle password protection
        if (share.isPasswordProtected && !filePasswords.get(shareToken)) {
            if (!password) return res.status(401).json({ error: 'Password required', isPasswordProtected: true });
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            if (hashedPassword !== share.password) return res.status(401).json({ error: 'Incorrect password' });
            filePasswords.set(shareToken, true);
        }
        
        if (share.permission !== 'view_download') return res.status(403).json({ error: 'No download permission' });
        
        const { findFileById } = require('./files');
        const file = await findFileById(share.fileId, share.ownerId);
        
        if (!file) return res.status(404).json({ error: 'File not found' });
        
        const fileName = file.originalName || file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const contentType = getContentType(fileExtension);
        
        const params = {
            Bucket: file.s3Bucket || process.env.S3_BUCKET,
            Key: file.s3Key
        };
        
        const fileStream = s3.getObject(params).createReadStream();
        
        res.attachment(fileName);
        res.set('Content-Type', contentType);
        res.set('Content-Length', file.size);
        
        fileStream.pipe(res);
        
        console.log(`📥 File downloaded: ${file.name} via share`);
        return;
    } catch (error) {
        console.error('Shared file download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Delete a share
router.delete('/:shareToken', auth, async (req, res) => {
    try {
        const { shareToken } = req.params;
        const user = req.user;
        
        const result = await ShareLink.deleteOne({ shareToken: shareToken, ownerId: user.id });
        
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Share not found' });
        
        res.json({ message: 'Share deleted successfully' });
    } catch (error) {
        console.error('Delete share error:', error);
        res.status(500).json({ error: 'Failed to delete share' });
    }
});

// Make shares available for debugging
router.get('/debug/shares', async (req, res) => {
    const allShares = await ShareLink.find({});
    res.json({ shares: allShares });
});

module.exports = router;
