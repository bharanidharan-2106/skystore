import React, { useState } from 'react';
import axios from 'axios';
import { getToken } from '../utils/auth';

function CreateFolder({ currentFolder, onFolderCreated }) {
    const [folderName, setFolderName] = useState('');
    const [isProtected, setIsProtected] = useState(false);
    const [password, setPassword] = useState('');
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const handleCreateFolder = async () => {
        if (!folderName.trim()) {
            alert('Please enter a folder name');
            return;
        }

        try {
            setCreating(true);
            
            const folderData = {
                name: folderName.trim(),
                parentId: currentFolder?.id || null,
                isProtected: isProtected.toString(),
            };

            if (isProtected) {
                folderData.password = password;
            }

            const response = await axios.post('http://localhost:5000/api/folders/create', folderData, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Folder created:', response.data);
            
            // Reset form
            setFolderName('');
            setIsProtected(false);
            setPassword('');
            setShowForm(false);
            
            alert('Folder created successfully!');
            
            if (onFolderCreated) {
                onFolderCreated();
            }
            
        } catch (error) {
            console.error('Folder creation error:', error);
            alert('Folder creation failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="create-folder">
            <button 
                onClick={() => setShowForm(!showForm)}
                className="create-folder-btn"
            >
                📁 Create New Folder
            </button>

            {showForm && (
                <div className="folder-form">
                    <h4>Create New Folder</h4>
                    
                    <div className="form-group">
                        <label>Folder Name:</label>
                        <input
                            type="text"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            placeholder="Enter folder name"
                            className="folder-name-input"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={isProtected}
                                onChange={(e) => setIsProtected(e.target.checked)}
                            />
                            Password Protect this Folder
                        </label>
                        
                        {isProtected && (
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="password-input"
                            />
                        )}
                    </div>
                    
                    <div className="form-actions">
                        <button 
                            onClick={handleCreateFolder}
                            disabled={creating || !folderName.trim()}
                            className="create-btn"
                        >
                            {creating ? 'Creating...' : 'Create Folder'}
                        </button>
                        <button 
                            onClick={() => setShowForm(false)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CreateFolder;