// frontend/src/components/FileUpload.js
import React, { useState } from 'react';
import axios from 'axios';
import { getToken } from '../utils/auth';
import './FileUpload.css';

function FileUpload({ onUploadComplete }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [isProtected, setIsProtected] = useState(false);
    const [password, setPassword] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setFileName(file?.name || '');
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('Please select a file first');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('fileName', fileName || selectedFile.name);
            formData.append('isProtected', isProtected.toString());
            
            if (isProtected) {
                formData.append('password', password);
            }

            await axios.post('http://localhost:5000/api/files/upload', formData, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('✅ File uploaded successfully!');
            
            // Reset form
            setSelectedFile(null);
            setFileName('');
            setIsProtected(false);
            setPassword('');
            document.getElementById('file-input').value = '';
            
            if (onUploadComplete) {
                onUploadComplete();
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="file-upload">
            <h3>📤 Upload New File</h3>
            
            <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                className="file-input"
            />
            
            {selectedFile && (
                <div className="file-info">
                    <p><strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</p>
                    
                    <div className="file-name-input">
                        <label>File Name (optional):</label>
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="Enter custom file name"
                        />
                    </div>
                    
                    <div className="protection-option">
                        <label>
                            <input
                                type="checkbox"
                                checked={isProtected}
                                onChange={(e) => setIsProtected(e.target.checked)}
                            />
                            🔒 Password Protect this File
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
                    
                    <button 
                        onClick={handleUpload} 
                        disabled={uploading}
                        className="upload-btn"
                    >
                        {uploading ? '⏳ Uploading...' : '🚀 Upload File'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default FileUpload;