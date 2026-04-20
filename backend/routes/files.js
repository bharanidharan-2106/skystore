const express = require('express');
const router = express.Router();
const multer = require('multer');
const AWS = require('aws-sdk');
const auth = require('../middleware/auth');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

// In-memory storage for files (replace with database later)
const fileStorage = [];

// Export fileStorage and findFileById for use in other modules
module.exports.fileStorage = fileStorage;
module.exports.findFileById = findFileById;

// Helper function to find file by ID (checks both memory and S3)
async function findFileById(fileId, userId, username) {
    // First check memory storage
    let file = fileStorage.find(f => f.id === fileId && f.userId === userId);
    if (file) return file;
    
    // If not in memory, search in S3
    const userFolder = `${username}_${userId}`;
    const oldUserFolder = userId;
    
    try {
        // Try new folder format
        let s3Params = {
            Bucket: process.env.S3_BUCKET,
            Prefix: `users/${userFolder}/`
        };
        
        let s3Data = await s3.listObjectsV2(s3Params).promise();
        let s3Files = s3Data.Contents || [];
        
        // Try old folder format if not found
        if (s3Files.length === 0) {
            s3Params.Prefix = `users/${oldUserFolder}/`;
            s3Data = await s3.listObjectsV2(s3Params).promise();
            s3Files = s3Data.Contents || [];
        }
        
        // Find file by key (using fileId as part of the key)
        const s3File = s3Files.find(f => f.Key.includes(fileId) || f.ETag.replace(/"/g, '') === fileId);
        if (s3File) {
            const keyParts = s3File.Key.split('/');
            const fullFileName = keyParts[keyParts.length - 1];
            const fileName = fullFileName.replace(/^\d+-/, '');
            
            return {
                id: s3File.ETag.replace(/"/g, ''),
                userId: userId,
                name: fileName,
                originalName: fileName,
                s3Key: s3File.Key,
                s3Url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3File.Key}`,
                size: s3File.Size,
                mimeType: 'application/octet-stream',
                isProtected: false,
                password: null,
                uploadedAt: s3File.LastModified,
                s3Bucket: process.env.S3_BUCKET
            };
        }
    } catch (error) {
        console.error('Error finding file in S3:', error);
    }
    
    return null;
}

// Debug endpoint to check files
router.get('/debug-structure', auth, async (req, res) => {
    try {
        const user = req.user;
        const userFiles = fileStorage.filter(file => file.userId === user.id);
        
        console.log('🔍 DEBUG - User files:', userFiles);
        
        res.json({
            message: 'Debug info logged to console',
            fileCount: userFiles.length,
            files: userFiles
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload file route - FIXED S3 UPLOAD
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        console.log('📤 Upload request received');
        console.log('📁 File details:', req.file);
        console.log('📝 Body details:', req.body);

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = req.user;
        const fileName = req.body.fileName || req.file.originalname;
        const isProtected = req.body.isProtected === 'true';
        const password = req.body.password;
        const fileId = Date.now().toString();
        
        // Create S3 key with folder structure: users/username_userId/filename
        // This makes it easy to identify users in S3 bucket
        const userFolder = `${user.username}_${user.id}`;
        const fileKey = `users/${userFolder}/${fileId}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        console.log('📍 S3 Upload Details:');
        console.log('  - Bucket:', process.env.S3_BUCKET);
        console.log('  - Key:', fileKey);
        console.log('  - File size:', req.file.size, 'bytes');

        // Upload to S3 - FIXED: Using env variable
        const s3Params = {
            Bucket: process.env.S3_BUCKET,  // ✅ Dynamic bucket name
            Key: fileKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            Metadata: {
                'uploaded-by': user.id,
                'original-filename': req.file.originalname,
                'upload-time': new Date().toISOString()
            }
        };

        console.log('🚀 Starting S3 upload...');
        const s3Result = await s3.upload(s3Params).promise();
        console.log('✅ S3 upload successful!');
        console.log('   Location:', s3Result.Location);
        console.log('   Key:', s3Result.Key);

        // Create file data for storage
        const fileData = {
            id: fileId,
            userId: user.id,
            name: fileName,
            originalName: req.file.originalname,
            s3Key: fileKey,
            s3Url: s3Result.Location,
            size: req.file.size,
            mimeType: req.file.mimetype,
            isProtected: isProtected,
            password: isProtected ? password : null,
            uploadedAt: new Date(),
            s3Bucket: process.env.S3_BUCKET
        };

        // Store in memory
        fileStorage.push(fileData);
        console.log('💾 File metadata stored in memory');

        res.json({ 
            message: 'File uploaded successfully to S3!', 
            file: fileData,
            s3Info: {
                bucket: process.env.S3_BUCKET,
                key: fileKey,
                location: s3Result.Location
            }
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        console.error('Error details:', error.message);
        
        // More detailed error info
        if (error.code === 'NoSuchBucket') {
            res.status(500).json({ error: `S3 bucket does not exist: ${process.env.S3_BUCKET}` });
        } else if (error.code === 'AccessDenied') {
            res.status(500).json({ error: 'AWS access denied. Check your credentials.' });
        } else if (error.code === 'InvalidAccessKeyId') {
            res.status(500).json({ error: 'Invalid AWS access key.' });
        } else {
            res.status(500).json({ error: 'Upload failed: ' + error.message });
        }
    }
});

// Get user's files - Fetch from S3
router.get('/my-files', auth, async (req, res) => {
    try {
        const user = req.user;
        
        // Build user folder path (supports both old and new format)
        const userFolder = `${user.username}_${user.id}`;
        const oldUserFolder = user.id;
        
        console.log(`📁 Fetching files for user: ${user.username} (${user.id})`);
        
        // List objects from S3 for this user
        const s3Params = {
            Bucket: process.env.S3_BUCKET,
            Prefix: `users/${userFolder}/`
        };
        
        let s3Files = [];
        
        try {
            const s3Data = await s3.listObjectsV2(s3Params).promise();
            s3Files = s3Data.Contents || [];
            console.log(`  Found ${s3Files.length} files in new folder format`);
        } catch (error) {
            console.log('  No files in new folder format, checking old format...');
        }
        
        // Also check old folder format for backward compatibility
        if (s3Files.length === 0) {
            const oldS3Params = {
                Bucket: process.env.S3_BUCKET,
                Prefix: `users/${oldUserFolder}/`
            };
            
            try {
                const oldS3Data = await s3.listObjectsV2(oldS3Params).promise();
                s3Files = oldS3Data.Contents || [];
                console.log(`  Found ${s3Files.length} files in old folder format`);
            } catch (error) {
                console.log('  No files in old folder format either');
            }
        }
        
        // Convert S3 objects to file format
        const files = s3Files.map(s3File => {
            // Extract filename from key (remove path)
            const keyParts = s3File.Key.split('/');
            const fullFileName = keyParts[keyParts.length - 1];
            
            // Remove timestamp prefix if exists (e.g., "1730000000000-filename.pdf" -> "filename.pdf")
            const fileName = fullFileName.replace(/^\d+-/, '');
            
            // Check if this file exists in memory storage for additional metadata
            const memoryFile = fileStorage.find(f => f.s3Key === s3File.Key);
            
            return {
                id: memoryFile?.id || s3File.ETag.replace(/"/g, ''), // Use ETag as ID if not in memory
                userId: user.id,
                name: memoryFile?.name || fileName,
                originalName: memoryFile?.originalName || fileName,
                s3Key: s3File.Key,
                s3Url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${s3File.Key}`,
                size: s3File.Size,
                mimeType: memoryFile?.mimeType || 'application/octet-stream',
                isProtected: memoryFile?.isProtected || false,
                password: memoryFile?.password || null,
                uploadedAt: memoryFile?.uploadedAt || s3File.LastModified,
                s3Bucket: process.env.S3_BUCKET
            };
        });
        
        console.log(`✅ Returning ${files.length} files for user: ${user.username}`);
        
        res.json({
            files: files,
            folders: []
        });
    } catch (error) {
        console.error('❌ Error fetching files:', error);
        res.status(500).json({ error: 'Failed to fetch files: ' + error.message });
    }
});

// Get folder contents (simplified)
router.get('/folders/:folderId/contents', auth, async (req, res) => {
    try {
        const user = req.user;
        const userFiles = fileStorage.filter(file => file.userId === user.id);
        
        res.json({
            files: userFiles,
            subfolders: []
        });
    } catch (error) {
        console.error('❌ Error fetching folder contents:', error);
        res.status(500).json({ error: 'Failed to fetch folder contents' });
    }
});

// Verify password for protected file
router.post('/verify-password/:fileId', auth, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { password } = req.body;
        const user = req.user;
        
        const file = fileStorage.find(f => f.id === fileId && f.userId === user.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if file is protected
        if (!file.isProtected) {
            return res.status(400).json({ error: 'File is not password protected' });
        }

        // Verify password
        if (file.password !== password) {
            console.log('❌ Password verification failed for file:', file.name);
            return res.status(401).json({ error: 'Incorrect password' });
        }

        console.log('✅ Password verified for file:', file.name);
        
        // Generate presigned URL for download
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: file.s3Key,
            Expires: 300 // 5 minutes
        };

        const downloadUrl = s3.getSignedUrl('getObject', params);
        
        res.json({
            message: 'Password verified, download URL generated',
            downloadUrl: downloadUrl,
            file: file
        });
        
    } catch (error) {
        console.error('❌ Password verification error:', error);
        res.status(500).json({ error: 'Verification failed: ' + error.message });
    }
});

// Download file
router.get('/download/:fileId', auth, async (req, res) => {
    try {
        const { fileId } = req.params;
        const user = req.user;
        
        const file = await findFileById(fileId, user.id, user.username);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // If file is protected, don't allow direct download
        if (file.isProtected) {
            return res.status(403).json({ 
                error: 'This file is password protected. Please verify password first.',
                isProtected: true
            });
        }

        // Generate presigned URL for download
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: file.s3Key,
            Expires: 300 // 5 minutes
        };

        const downloadUrl = s3.getSignedUrl('getObject', params);
        
        res.json({
            message: 'Download URL generated',
            downloadUrl: downloadUrl,
            file: file
        });
        
    } catch (error) {
        console.error('❌ Download error:', error);
        res.status(500).json({ error: 'Download failed: ' + error.message });
    }
});

// Delete file
router.delete('/:fileId', auth, async (req, res) => {
    try {
        const { fileId } = req.params;
        const user = req.user;

        const file = await findFileById(fileId, user.id, user.username);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete from S3
        console.log('🗑️ Deleting from S3:', file.s3Key);
        await s3.deleteObject({
            Bucket: process.env.S3_BUCKET,
            Key: file.s3Key
        }).promise();

        // Delete from memory if exists
        const fileIndex = fileStorage.findIndex(f => f.id === fileId && f.userId === user.id);
        if (fileIndex !== -1) {
            fileStorage.splice(fileIndex, 1);
        }
        
        console.log('✅ File deleted successfully');

        res.json({ 
            message: 'File deleted successfully',
            deletedFile: file
        });
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ error: 'Delete failed: ' + error.message });
    }
});

// Get file info
router.get('/:fileId', auth, async (req, res) => {
    try {
        const { fileId } = req.params;
        const user = req.user;
        
        const file = fileStorage.find(f => f.id === fileId && f.userId === user.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json({ file });
    } catch (error) {
        console.error('❌ File info error:', error);
        res.status(500).json({ error: 'Failed to get file info' });
    }
});

// Export both router and fileStorage for sharing functionality
module.exports = router;
module.exports.fileStorage = fileStorage;
module.exports.findFileById = findFileById;