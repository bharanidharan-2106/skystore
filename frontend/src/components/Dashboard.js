import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import FileExplorer from './FileExplorer';
import FileUpload from './FileUpload';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
    const [username, setUsername] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/auth/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setUsername(data.username);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        if (onLogout) onLogout();
        navigate('/login');
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div className="header-left">
                    <h2>SkyStore Dashboard</h2>
                </div>
                <div className="header-right">
                    <button className="username-button">{username}</button>
                    <button className="logout-button" onClick={handleLogout}>Logout</button>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="sidebar">
                    <FileUpload onUploadComplete={handleRefresh} />
                    <button onClick={handleRefresh} className="refresh-btn">
                         Refresh Files
                    </button>
                </div>

                <div className="main-content">
                    <FileExplorer key={refreshKey} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;