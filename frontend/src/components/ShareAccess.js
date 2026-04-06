import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { showError, showSuccess } from '../utils/errorHandler';
import './ShareAccess.css';

function ShareAccess() {
    const { shareToken } = useParams();
    const navigate = useNavigate();
    const [shareInfo, setShareInfo] = useState(null);
    const [fileInfo, setFileInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [password, setPassword] = useState('');
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        const accessShare = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/sharing/access/${shareToken}`);
                
                if (response.data.error === 'Password required') {
                    setShowPasswordForm(true);
                    setShareInfo({ isPasswordProtected: true });
                } else if (response.data.share) {
                    setShareInfo(response.data.share);
                    setFileInfo(response.data.file);
                } else {
                    // Handle other cases (e.g., expired, not found)
                    showError({ message: response.data.error || 'Failed to access shared file' });
                }
            } catch (error) {
                if (error.response?.data?.isPasswordProtected) {
                    setShowPasswordForm(true);
                    setShareInfo({ isPasswordProtected: true });
                } else {
                    showError(error, 'Failed to access shared file');
                }
            } finally {
                setLoading(false);
            }
        };

        accessShare();
    }, [shareToken]);
    
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        
        try {
            const response = await axios.post(
                `${API_BASE_URL}/sharing/verify-password/${shareToken}`, 
                { password }
            );
            
            if (response.data.verified) {
                // Reload the share info with the verified token
                const shareResponse = await axios.get(`${API_BASE_URL}/sharing/access/${shareToken}?password=${encodeURIComponent(password)}`);
                setShareInfo(shareResponse.data.share);
                setFileInfo(shareResponse.data.file);
                setShowPasswordForm(false);
            } else {
                setPasswordError('Incorrect password. Please try again.');
            }
        } catch (error) {
            setPasswordError(error.response?.data?.error || 'Failed to verify password');
        }
    };

    const handleDownload = async () => {
        try {
            setDownloading(true);
            
            // If password is required but not yet verified, show password form
            if (shareInfo?.isPasswordProtected && !password) {
                setShowPasswordForm(true);
                return;
            }
            
            // Get download URL from backend
            const response = await axios.get(
                `${API_BASE_URL}/sharing/download/${shareToken}${password ? `?password=${encodeURIComponent(password)}` : ''}`,
                { responseType: 'blob' }
            );
            
            // Handle direct file download (blob)
            if (response.data instanceof Blob) {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                const contentDisposition = response.headers['content-disposition'];
                let fileName = 'download';
                
                if (contentDisposition) {
                    const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (fileNameMatch && fileNameMatch[1]) {
                        fileName = fileNameMatch[1].replace(/['"]/g, '');
                    }
                }
                
                link.href = url;
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
                showSuccess('Download started!');
            } 
            // Handle S3 pre-signed URL
            else if (response.data.downloadUrl) {
                window.open(response.data.downloadUrl, '_blank');
                showSuccess('Download started!');
            }
            
        } catch (error) {
            if (error.response?.status === 401) {
                // Password required or incorrect
                setShowPasswordForm(true);
                if (error.response.data?.isPasswordProtected) {
                    setPasswordError('Password is required to access this file');
                } else {
                    setPasswordError('Incorrect password. Please try again.');
                }
            } else if (error.response?.status === 403) {
                showError(error, 'You do not have download permission for this file');
            } else if (error.response?.status === 404) {
                showError(error, 'File not found or has been deleted');
            } else if (error.response?.status === 410) {
                showError(error, 'This share link has expired');
            } else {
                showError(error, 'Download failed. Please try again.');
            }
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="share-access">
                <div className="share-container">
                    <div className="loading">Loading shared file...</div>
                </div>
            </div>
        );
    }

    if (!shareInfo) {
        return (
            <div className="share-access">
                <div className="share-container">
                    <div className="error">Share link not found or expired</div>
                </div>
            </div>
        );
    }

    // Show password form if password is required
    if (showPasswordForm) {
        return (
            <div className="share-access">
                <div className="share-container">
                    <h1>🔒 Password Required</h1>
                    <div className="share-info">
                        <p>This file is password protected. Please enter the password to continue.</p>
                        
                        <form onSubmit={handlePasswordSubmit} className="password-form">
                            <div className="form-group">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                    className="password-input"
                                />
                                {passwordError && <div className="error-message">{passwordError}</div>}
                            </div>
                            <button 
                                type="submit" 
                                className="download-shared-btn"
                                disabled={!password}
                            >
                                Continue
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="share-access">
            <div className="share-container">
                <h1>🔗 Shared File</h1>
                <div className="share-info">
                    {fileInfo ? (
                        <>
                            <h2>{fileInfo.name}</h2>
                            <p><strong>Size:</strong> {formatFileSize(fileInfo.size)}</p>
                            <p><strong>Type:</strong> {fileInfo.type || 'Unknown'}</p>
                            <p><strong>Uploaded:</strong> {new Date(fileInfo.createdAt).toLocaleDateString()}</p>
                        </>
                    ) : (
                        <h2>Shared File</h2>
                    )}
                    
                    <div className="share-meta">
                        <p><strong>Permission:</strong> {shareInfo.permission === 'view' ? 'View Only' : 'View & Edit'}</p>
                        <p><strong>Access Count:</strong> {shareInfo.accessCount || 0}</p>
                        <p><strong>Expires:</strong> {new Date(shareInfo.expiresAt).toLocaleDateString()}</p>
                        {shareInfo.isPasswordProtected && <p className="password-protected">🔒 Password Protected</p>}
                    </div>
                    
                    <button 
                        onClick={handleDownload}
                        disabled={downloading}
                        className="download-shared-btn"
                    >
                        {downloading ? 'Downloading...' : '⬇️ Download File'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default ShareAccess;