import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ShareAccess from './components/ShareAccess';
import { getToken } from './utils/auth';
import './App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in (has token)
        const token = getToken();
        if (token) {
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const handleAuth = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
    };

    if (loading) {
        return <div className="loading">Loading SkyStore...</div>;
    }

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleAuth} /> : <Navigate to="/dashboard" />} />
                    <Route path="/register" element={!isAuthenticated ? <Register onRegister={handleAuth} /> : <Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} />
                    <Route path="/share/:shareToken" element={<ShareAccess />} />
                    <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;