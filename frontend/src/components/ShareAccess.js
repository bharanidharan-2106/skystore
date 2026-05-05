import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getToken } from '../utils/auth';
import { showError, showSuccess } from '../utils/errorHandler';
import AuthModal from './AuthModal';
import './ShareAccess.css';

function ShareAccess({ isAuthenticated, onLogin }) {
    const { shareToken } = useParams();
    const navigate = useNavigate();
    const [shareInfo, setShareInfo] = useState(null);
    const [fileInfo, setFileInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [password, setPassword] = useState('');
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const accessShare = useCallback(async () => {
        try {
            setLoading(true);
            const token = getToken();
            const config = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
            
            const response = await axios.get(`${API_BASE_URL}/sharing/access/${shareToken}`, config);
            
            if (response.data.share) {
                setShareInfo(response.data.share);
                setFileInfo(response.data.file);
                setShowPasswordForm(false);
            }
        } catch (error) {
            if (error.response?.status === 401 && error.response.data.isPasswordProtected) {
                setShowPasswordForm(true);
                setShareInfo({ isPasswordProtected: true });
            } else {
                showError(error, 'Failed to access shared file');
                setShareInfo(null);
            }
        } finally {
            setLoading(false);
        }
    }, [shareToken]);

    useEffect(() => {
        accessShare();
    }, [accessShare, isAuthenticated]); // Re-fetch when auth status changes

    const handleAuthSuccess = () => {
        if (onLogin) onLogin();
        setIsAuthModalOpen(false);
        // accessShare will be re-triggered by useEffect
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        
        try {
            const token = getToken();
            const config = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
            
            const response = await axios.get(
                `${API_BASE_URL}/sharing/access/${shareToken}?password=${encodeURIComponent(password)}`,
                config
            );
            
            if (response.data.share) {
                setShareInfo(response.data.share);
                setFileInfo(response.data.file);
                setShowPasswordForm(false);
            }
        } catch (error) {
            setPasswordError(error.response?.data?.error || 'Failed to verify password');
        }
    };

    const handleDownload = async () => {
        if (!isAuthenticated) {
            setIsAuthModalOpen(true);
            return;
        }

        try {
            setDownloading(true);
            const token = getToken();
            
            // Get download URL from backend
            const response = await axios.get(
                `${API_BASE_URL}/sharing/download/${shareToken}${password ? `?password=${encodeURIComponent(password)}` : ''}`,
                { 
                    headers: { 'Authorization': `Bearer ${token}` },
                    responseType: 'blob' 
                }
            );
            
            if (response.data instanceof Blob) {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', fileInfo?.name || 'download');
                document.body.appendChild(link);
                link.click();
                link.remove();
                showSuccess('Download started!');
            }
        } catch (error) {
            if (error.response?.status === 403) {
                showError(null, 'You only have viewing permission for this file.');
            } else {
                showError(error, 'Download failed');
            }
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="share-access">
                <div className="share-container loader-view">
                    <div className="loading-spinner"></div>
                    <p>Fetching shared file securely...</p>
                </div>
            </div>
        );
    }

    // If not authenticated, we still show the page BUT hide the file contents/details 
    // OR we can just show the AuthModal overlay if they try to access.
    // However, the user said "If other user click that shared link... if not they must login".
    // So I'll show a "Login Required" card if they aren't authenticated.
    
    if (!isAuthenticated && !loading) {
        return (
            <div className="share-access">
                <div className="share-container auth-gate">
                    <div className="gate-icon">🔐</div>
                    <h1>Login to Access File</h1>
                    <p>Secure file sharing requires you to be logged into your SkyStore account.</p>
                    <button className="gate-login-btn" onClick={() => setIsAuthModalOpen(true)}>Log In to View File</button>
                    <AuthModal 
                        isOpen={isAuthModalOpen} 
                        onClose={() => navigate('/dashboard')} 
                        onAuthSuccess={handleAuthSuccess}
                    />
                </div>
            </div>
        );
    }

    if (!shareInfo) {
        return (
            <div className="share-access">
                <div className="share-container error-view">
                    <h1>⚠️ Link Expired or Invalid</h1>
                    <p>This share link is no longer active or may have been deleted by the owner.</p>
                    <button onClick={() => navigate('/dashboard')} className="back-btn">Go to Dashboard</button>
                </div>
            </div>
        );
    }

    if (showPasswordForm) {
        return (
            <div className="share-access">
                <div className="share-container password-gate">
                    <h1>🔒 Password Protected</h1>
                    <p>Please enter the secret password provided by the owner to unlock this file.</p>
                    <form onSubmit={handlePasswordSubmit} className="password-form">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="File password"
                            required
                        />
                        {passwordError && <div className="error-text">{passwordError}</div>}
                        <button type="submit" className="unlock-btn">Unlock File</button>
                    </form>
                </div>
            </div>
        );
    }

    const canDownload = shareInfo?.permission === 'view_download';

    return (
        <div className="share-access">
            <div className="share-container main-view">
                <div className="share-header">
                    <div className="share-file-icon">📄</div>
                    <div className="share-title-group">
                        <h1>{fileInfo?.name || 'Shared File'}</h1>
                        <span className="share-badge">{shareInfo?.permission === 'view_only' ? '👁️ View Only' : '⬇️ View & Download'}</span>
                    </div>
                </div>

                <div className="file-preview-card">
                    <div className="preview-meta">
                        <div className="meta-item">
                            <label>Owner</label>
                            <span>SkyStore User</span>
                        </div>
                        <div className="meta-item">
                            <label>File Size</label>
                            <span>{formatFileSize(fileInfo?.size || 0)}</span>
                        </div>
                        <div className="meta-item">
                            <label>Expires on</label>
                            <span>{new Date(shareInfo?.expiresAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="share-actions">
                        {canDownload ? (
                            <button 
                                onClick={handleDownload}
                                disabled={downloading}
                                className="main-download-btn"
                            >
                                {downloading ? 'Preparing Download...' : 'Download File'}
                            </button>
                        ) : (
                            <div className="view-only-notice">
                                <p>You have permission to view this file metadata only. Downloading is restricted by the owner.</p>
                            </div>
                        )}
                        <button onClick={() => navigate('/dashboard')} className="secondary-btn">Go to my Dashboard</button>
                    </div>
                </div>
            </div>
            
            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                onAuthSuccess={handleAuthSuccess}
            />
        </div>
    );
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default ShareAccess;