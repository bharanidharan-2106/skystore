import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
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
            
            if (isProtected && password) {
                formData.append('password', password);
            }

            const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            console.log(' Upload successful:', response.data);
            alert('File uploaded successfully!');
            
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
            <h3>Upload New File</h3>
            
            <div className="upload-section">
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
                            <label className="protection-label">
                                <input
                                    type="checkbox"
                                    checked={isProtected}
                                    onChange={(e) => setIsProtected(e.target.checked)}
                                    className="protection-checkbox"
                                />
                                <span className="protection-text">🔒 Password Protect this File</span>
                            </label>
                            
                            {isProtected && (
                                <div className="password-input-group">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password for this file"
                                        className="password-input"
                                        required
                                    />
                                    <small className="password-hint">
                                        You'll need this password to download the file
                                    </small>
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={handleUpload} 
                            disabled={uploading || (isProtected && !password)}
                            className="upload-btn"
                        >
                            {uploading ? '⏳ Uploading...' : 'Upload File'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FileUpload;