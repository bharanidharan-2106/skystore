import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) => {
    const [mode, setMode] = useState(initialMode); // 'login' or 'register'
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
        const body = mode === 'login' 
            ? { username, password } 
            : { username, email, password };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                onAuthSuccess();
                onClose();
            } else {
                setError(data.error || `${mode === 'login' ? 'Login' : 'Registration'} failed`);
            }
        } catch (err) {
            setError(`Something went wrong. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="auth-modal-close" onClick={onClose}>&times;</button>
                
                <div className="auth-modal-left">
                    <div className="auth-modal-header">
                        <div className="auth-logo">S</div>
                        <h1>Welcome to SkyStore</h1>
                        <p>{mode === 'login' ? 'Enter your details to log in' : 'Create an account to get started'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="auth-input-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                required
                            />
                        </div>

                        {mode === 'register' && (
                            <div className="auth-input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        )}

                        <div className="auth-input-group">
                            <label>Password</label>
                            <div className="password-field-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                    className="password-input-inner"
                                />
                                <button 
                                    type="button" 
                                    className="password-toggle-btn"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowPassword(!showPassword);
                                    }}
                                    tabIndex="-1"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? (mode === 'login' ? 'Logging in...' : 'Signing up...') : (mode === 'login' ? 'Log in' : 'Sign up')}
                        </button>
                    </form>

                    <div className="auth-switch">
                        {mode === 'login' ? (
                            <p>Not on SkyStore yet? <span onClick={() => setMode('register')}>Sign up</span></p>
                        ) : (
                            <p>Already a member? <span onClick={() => setMode('login')}>Log in</span></p>
                        )}
                    </div>
                    
                    <p className="auth-terms">
                        By continuing, you agree to SkyStore's <span>Terms of Service</span> and acknowledge you've read our <span>Privacy Policy</span>.
                    </p>
                </div>

                <div className="auth-modal-right">
                    <div className="auth-promo">
                        <h2>Secure. Fast. Simple.</h2>
                        <p>Store and share your files with ease and confidence.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
