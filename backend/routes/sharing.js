const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const crypto = require('crypto');
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// In-memory storage for shares (use database in production)
let shares = [];

// In-memory storage for file passwords (use database in production)
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
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo'
    };
    
    return types[extension] || 'application/octet-stream';
}

// Generate share link
router.post('/share', auth, async (req, res) => {
    try {
        const { fileId, permission, expiresIn, password } = req.body;
        const user = req.user;
        
        const shareToken = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + (expiresIn || 7 * 24 * 60 * 60 * 1000)); // Default 7 days
        
        const share = {
            id: shareToken,
            fileId: fileId,
            ownerId: user.id,
            permission: permission || 'view',
            expiresAt: expiresAt,
            createdAt: new Date(),
            accessCount: 0,
            isPasswordProtected: !!password,
            password: password ? crypto.createHash('sha256').update(password).digest('hex') : null
        };
        
        shares.push(share);
        
        // Generate share URL dynamically based on environment
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

// Verify password for protected share
router.post('/verify-password/:shareToken', async (req, res) => {
    try {
        const { shareToken } = req.params;
        const { password } = req.body;
        
        const share = shares.find(s => s.id === shareToken);
        
        if (!share) {
            return res.status(404).json({ error: 'Share link not found or expired' });
        }
        
        if (new Date() > share.expiresAt) {
            return res.status(410).json({ error: 'Share link has expired' });
        }
        
        if (!share.isPasswordProtected) {
            return res.json({ verified: true });
        }
        
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        const isVerified = hashedPassword === share.password;
        
        if (isVerified) {
            // Store verification in memory (in production, use a secure session or JWT)
            filePasswords.set(shareToken, true);
        }
        
        res.json({ verified: isVerified });
        
    } catch (error) {
        console.error('Password verification error:', error);
        res.status(500).json({ error: 'Password verification failed' });
    }
});

// Access shared file
router.get('/access/:shareToken', async (req, res) => {
    try {
        const { shareToken } = req.params;
        const { password } = req.query;
        
        console.log('🔍 Accessing share with token:', shareToken);
        console.log('📋 Available shares:', shares.map(s => ({ id: s.id, fileId: s.fileId })));
        
        const share = shares.find(s => s.id === shareToken);
        
        if (!share) {
            return res.status(404).json({ error: 'Share link not found or expired' });
        }
        
        if (new Date() > share.expiresAt) {
            return res.status(410).json({ error: 'Share link has expired' });
        }
        
        // Check if password is required and not verified
        if (share.isPasswordProtected) {
            const isVerified = filePasswords.get(shareToken) === true || 
                              (password && crypto.createHash('sha256').update(password).digest('hex') === share.password);
            
            if (!isVerified) {
                return res.status(401).json({ 
                    error: 'Password required',
                    isPasswordProtected: true
                });
            }
            
            // Store verification in memory
            filePasswords.set(shareToken, true);
        }
        
        share.accessCount++;
        
        // Import required functions from files route
        const { findFileById, fileStorage } = require('./files');
        
        // First try to find file in memory
        let file = fileStorage.find(f => f.id === share.fileId);
        
        // If not found in memory, try to find in S3
        if (!file && findFileById) {
            try {
                // We need to pass userId and username, but we don't have them in the share object
                // This is a limitation of the current implementation
                // In a production app, we should store the owner's ID in the share object
                file = await findFileById(share.fileId, share.ownerId, 'shared');
                
                // If file is found in S3 but not in memory, add it to memory for future access
                if (file) {
                    fileStorage.push(file);
                }
            } catch (error) {
                console.error('Error finding file:', error);
                return res.status(500).json({ 
                    error: 'Error accessing file',
                    details: error.message 
                });
            }
        }
        
        if (!file) {
            return res.status(404).json({ error: 'File not found. It may have been deleted.' });
        }
        
        // Get file extension and type
        const fileName = file.originalName || file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const fileType = file.mimeType || getContentType(fileExtension);
        
        // Format file size
        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        res.json({
            message: 'Share access granted',
            share: {
                fileId: share.fileId,
                fileName: fileName,
                fileSize: formatFileSize(file.size),
                fileSizeBytes: file.size,
                fileType: fileType,
                fileExtension: fileExtension,
                permission: share.permission,
                uploadedAt: file.uploadedAt ? new Date(file.uploadedAt).toISOString() : null,
                expiresAt: share.expiresAt ? new Date(share.expiresAt).toISOString() : null,
                accessCount: share.accessCount || 0,
                isPasswordProtected: share.isPasswordProtected || false
            },
            file: {
                name: fileName,
                size: file.size,
                formattedSize: formatFileSize(file.size),
                type: fileType,
                extension: fileExtension,
                uploadedAt: file.uploadedAt ? new Date(file.uploadedAt).toISOString() : null,
                lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null,
                url: file.s3Url || null
            }
        });
        
    } catch (error) {
        console.error('Share access error:', error);
        res.status(500).json({ error: 'Share access failed' });
    }
});

// Download shared file
router.get('/download/:shareToken', async (req, res) => {
    try {
        const { shareToken } = req.params;
        const { password } = req.query;
        
        const share = shares.find(s => s.id === shareToken);
        
        if (!share) {
            return res.status(404).json({ error: 'Share link not found or expired' });
        }
        
        if (new Date() > share.expiresAt) {
            return res.status(410).json({ error: 'Share link has expired' });
        }
        
        // Check if password is required and not verified
        if (share.isPasswordProtected && !filePasswords.get(shareToken)) {
            if (!password) {
                return res.status(401).json({ 
                    error: 'Password required',
                    isPasswordProtected: true
                });
            }
            
            // Verify password
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            if (hashedPassword !== share.password) {
                return res.status(401).json({ 
                    error: 'Incorrect password',
                    isPasswordProtected: true
                });
            }
            
            // Store verification in memory
            filePasswords.set(shareToken, true);
        }
        
        // Check permission - only 'view' and 'edit' can download
        if (share.permission !== 'view' && share.permission !== 'edit') {
            return res.status(403).json({ error: 'No download permission' });
        }
        
        // Get file from storage using findFileById helper
        const filesModule = require('./files');
        const findFileById = filesModule.findFileById;
        const fileStorage = filesModule.fileStorage || [];
        
        // First try to find in memory
        let file = fileStorage.find(f => f.id === share.fileId);
        
        // If not found in memory, try to find in S3
        if (!file && findFileById) {
            try {
                file = await findFileById(share.fileId, share.ownerId, 'shared');
                
                // If file is found in S3 but not in memory, add it to memory for future access
                if (file) {
                    fileStorage.push(file);
                }
            } catch (error) {
                console.error('Error finding file:', error);
                return res.status(500).json({ 
                    error: 'Error finding file',
                    details: error.message 
                });
            }
        }
        
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Set appropriate headers for file download
        const fileName = file.originalName || file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const contentType = getContentType(fileExtension);
        
        // Get the file from S3
        const params = {
            Bucket: file.s3Bucket || process.env.S3_BUCKET,
            Key: file.s3Key
        };
        
        // Get the file stream from S3
        const fileStream = s3.getObject(params).createReadStream();
        
        // Set headers for file download
        res.attachment(fileName);
        res.set('Content-Type', contentType);
        res.set('Content-Length', file.size);
        
        // Stream the file to the response
        fileStream.pipe(res);
        
        // Log the download
        share.downloadCount = (share.downloadCount || 0) + 1;
        console.log(`📥 File downloaded: ${file.name} (${file.size} bytes)`);
        
        // Don't send JSON response since we're streaming the file
        return;
    } catch (error) {
        console.error(' Shared file download error:', error);
        res.status(500).json({ error: 'Download failed: ' + error.message });
    }
});

// Get all shares for a user
router.get('/my-shares', auth, async (req, res) => {
    try {
        const user = req.user;
        const userShares = shares.filter(share => share.ownerId === user.id);
        
        res.json({
            shares: userShares
        });
    } catch (error) {
        console.error('Get shares error:', error);
        res.status(500).json({ error: 'Failed to get shares' });
    }
});

// Delete a share
router.delete('/:shareToken', auth, async (req, res) => {
    try {
        const { shareToken } = req.params;
        const user = req.user;
        
        const shareIndex = shares.findIndex(share => share.id === shareToken && share.ownerId === user.id);
        
        if (shareIndex === -1) {
            return res.status(404).json({ error: 'Share not found' });
        }
        
        shares.splice(shareIndex, 1);
        
        res.json({
            message: 'Share deleted successfully'
        });
    } catch (error) {
        console.error('Delete share error:', error);
        res.status(500).json({ error: 'Failed to delete share' });
    }
});

// Make shares available for debugging
router.get('/debug/shares', (req, res) => {
    res.json({ shares });
});

module.exports = router;