const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Folder = require('../models/Folder');

// Create folder
router.post('/create', auth, async (req, res) => {
    try {
        const { name, parentId, isProtected, password } = req.body;
        const user = req.user;

        const folder = new Folder({
            userId: user.id,
            name: name,
            parentId: parentId || null,
            isProtected: isProtected === 'true',
            password: isProtected === 'true' ? password : null
        });

        await folder.save();

        res.json({ 
            message: 'Folder created successfully', 
            folder: folder 
        });
    } catch (error) {
        console.error('❌ Folder creation error:', error);
        res.status(500).json({ error: 'Folder creation failed: ' + error.message });
    }
});

// Get folder tree
router.get('/tree', auth, async (req, res) => {
    try {
        const user = req.user;
        const folders = await Folder.find({ userId: user.id });
        res.json(folders);
    } catch (error) {
        console.error('❌ Error fetching folder tree:', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});

module.exports = router;
// Add this at the end of backend/routes/folders.js
module.exports = router;