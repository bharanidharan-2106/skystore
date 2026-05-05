import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import FileExplorer from './FileExplorer';
import FileUpload from './FileUpload';
import AuthModal from './AuthModal';
import './Dashboard.css';

const Dashboard = ({ isAuthenticated, onLogin, onLogout }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            if (!isAuthenticated) return;
            
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await fetch(`${API_BASE_URL}/auth/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setUsername(data.username);
                    setEmail(data.email || '');
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [isAuthenticated]);

    const handleLogout = () => {
        if (onLogout) onLogout();
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const openAuthModal = (mode) => {
        setAuthMode(mode);
        setIsAuthModalOpen(true);
    };

    const navItems = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'all-files', label: 'All Files' },
        { id: 'shared', label: 'Shared' },
        { id: 'recent', label: 'Recent' }
    ];

    return (
        <div className="dashboard-container" id="main-dashboard">
            {/* Left Navigation Sidebar */}
            <nav className="nav-sidebar" id="left-nav">
                <div className="nav-logo">
                    <div className="logo-icon">S</div>
                    <span className="logo-text">SkyStore</span>
                </div>
                <div className="nav-links">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Central Main Area */}
            <main className="main-viewport" id="center-viewport">
                <header className="viewport-header">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {isAuthenticated ? (
                        <div className="user-profile">
                            <div className="profile-info">
                                <span className="username">{username || 'User'}</span>
                                <span className="email text-dim">{email || `${username}@skystore.com`}</span>
                            </div>
                            <img src={`https://ui-avatars.com/api/?name=${username}&background=6366f1&color=fff`} alt="Profile" className="avatar" />
                            <button className="logout-btn-text" onClick={handleLogout} title="Logout">Logout</button>
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <button className="login-trigger-btn" onClick={() => openAuthModal('login')}>Log in</button>
                            <button className="signup-trigger-btn" onClick={() => openAuthModal('register')}>Sign up</button>
                        </div>
                    )}
                </header>

                <section className="dashboard-sections">
                    {isAuthenticated ? (
                        <div className="upload-section">
                            <FileUpload onUploadComplete={handleRefresh} />
                        </div>
                    ) : (
                        <div className="guest-welcome-card">
                            <h2>Welcome to SkyStore</h2>
                            <p>Sign in to upload, store and share your files securely in the cloud.</p>
                            <button className="cta-login-btn" onClick={() => openAuthModal('login')}>Get Started</button>
                        </div>
                    )}

                    <div className="files-explorer-wrapper">
                        <div className="section-header">
                            <h2>{activeTab === 'dashboard' ? 'File Manager' : activeTab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h2>
                            <button onClick={handleRefresh} className="refresh-trigger">Refresh</button>
                        </div>
                        {isAuthenticated ? (
                            <FileExplorer key={`${refreshKey}-${searchTerm}-${activeTab}`} searchTerm={searchTerm} activeTab={activeTab} />
                        ) : (
                            <div className="explorer-locked-state">
                                <div className="locked-icon">🔒</div>
                                <h3>Storage Locked</h3>
                                <p>Please log in to view and manage your files.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                onAuthSuccess={onLogin}
                initialMode={authMode}
            />
        </div>
    );
};

export default Dashboard;