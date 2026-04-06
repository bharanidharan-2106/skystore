import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getToken } from '../utils/auth';
import './FileItem.css';

function FileItem({ file, onDelete, onDownload, onShareCreated }) {
    const [deleting, setDeleting] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [permission, setPermission] = useState('view');
    const [expiresIn, setExpiresIn] = useState(7); // 7 days
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [password, setPassword] = useState('');

    const handleDownload = async () => {
        if (file.isProtected) {
            setShowPasswordPrompt(true);
        } else {
            onDownload();
        }
    };

    const handleProtectedDownload = async () => {
        try {
            console.log('Verifying password for protected file:', file.name);
            const token = getToken();
            
            // Verify password with backend
            const response = await axios.post(
                `${API_BASE_URL}/files/verify-password/${file.id}`,
                { password },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.downloadUrl) {
                console.log('✅ Password verified, downloading file...');
                
                // Download the file using the presigned URL
                window.open(response.data.downloadUrl, '_blank');
                
                // Close the password prompt
                setShowPasswordPrompt(false);
                setPassword('');
            }
        } catch (error) {
            console.error('❌ Password verification failed:', error);
            if (error.response?.status === 401) {
                alert('Incorrect password. Please try again.');
            } else {
                alert('Password verification failed: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
            return;
        }

        try {
            setDeleting(true);
            const token = getToken();
            
            await axios.delete(`${API_BASE_URL}/files/${file.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('File deleted successfully');
            if (onDelete) {
                onDelete();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Delete failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setDeleting(false);
        }
    };

    const handleShare = async () => {
        setShowShareModal(true);
    };

    const createShareLink = async () => {
        try {
            setSharing(true);
            const token = getToken();
            
            const response = await axios.post(`${API_BASE_URL}/sharing/share`, {
                fileId: file.id,
                permission: permission,
                expiresIn: expiresIn * 24 * 60 * 60 * 1000 // Convert to milliseconds
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setShareLink(response.data.shareUrl);
            if (onShareCreated) {
                onShareCreated();
            }
        } catch (error) {
            console.error('Share creation failed:', error);
            alert('Share creation failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setSharing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareLink);
        alert('Share link copied to clipboard!');
    };

    return (
        <>
            <div className="file-item">
                <div className="file-icon">
                    {file.isProtected ? '🔒' : '📄'}
                </div>
                <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-details">
                        Size: {(file.size / 1024).toFixed(2)} KB • 
                        Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}
                    </div>
                    {file.isProtected && (
                        <div className="protected-badge">
                            🔒 Password Protected
                        </div>
                    )}
                </div>
                <div className="file-actions">
                    <button 
                        onClick={handleDownload} 
                        className="download-btn"
                        title="Download"
                    >
                        ⬇️
                    </button>
                    <button 
                        onClick={handleShare} 
                        className="share-btn"
                        title="Share"
                    >
                        🔗
                    </button>
                    <button 
                        onClick={handleDelete} 
                        disabled={deleting}
                        className="delete-btn"
                        title="Delete"
                    >
                        {deleting ? '🗑️...' : '🗑️'}
                    </button>
                </div>
            </div>

            {/* Password Prompt for Protected Files */}
            {showPasswordPrompt && (
                <div className="password-prompt-overlay">
                    <div className="password-prompt">
                        <h3>🔒 Protected File</h3>
                        <p>Enter password to download: <strong>{file.name}</strong></p>
                        
                        <input
                            type="password"
                            placeholder="Enter file password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="password-input"
                        />
                        
                        <div className="button-group">
                            <button 
                                onClick={() => setShowPasswordPrompt(false)} 
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleProtectedDownload} 
                                disabled={!password}
                                className="verify-btn"
                            >
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>🔗 Share File</h3>
                        <p>Share: <strong>{file.name}</strong></p>
                        
                        {!shareLink ? (
                            <div className="share-form">
                                <div className="form-group">
                                    <label>Permission:</label>
                                    <select 
                                        value={permission} 
                                        onChange={(e) => setPermission(e.target.value)}
                                    >
                                        <option value="view">View Only (Can download)</option>
                                        <option value="edit">View & Edit (Can download and modify)</option>
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Expires in (days):</label>
                                    <input 
                                        type="number" 
                                        value={expiresIn} 
                                        onChange={(e) => setExpiresIn(e.target.value)}
                                        min="1"
                                        max="30"
                                    />
                                </div>
                                
                                <div className="modal-actions">
                                    <button onClick={() => setShowShareModal(false)} className="cancel-btn">
                                        Cancel
                                    </button>
                                    <button onClick={createShareLink} disabled={sharing} className="create-btn">
                                        {sharing ? 'Creating...' : 'Create Share Link'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="share-result">
                                <p>Share link created!</p>
                                <div className="share-link">
                                    <input 
                                        type="text" 
                                        value={shareLink} 
                                        readOnly 
                                        className="link-input"
                                    />
                                    <button onClick={copyToClipboard} className="copy-btn">
                                        📋
                                    </button>
                                </div>
                                <button onClick={() => setShowShareModal(false)} className="close-btn">
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

export default FileItem;