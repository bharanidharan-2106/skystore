import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getToken } from '../utils/auth';
import FileItem from './FileItem';
import FileSearch from './FileSearch';
import { showError } from '../utils/errorHandler';
import './FileExplorer.css';

function FileExplorer({ searchTerm, activeTab }) {
    const [files, setFiles] = useState([]);
    const [sharedFileIds, setSharedFileIds] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const token = getToken();
            
            const response = await axios.get(`${API_BASE_URL}/files/my-files`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setFiles(response.data.files || []);

            // Also fetch the user's actually-shared file IDs
            const sharesRes = await axios.get(`${API_BASE_URL}/sharing/my-shares`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSharedFileIds(sharesRes.data.sharedFileIds || []);

        } catch (error) {
            showError(error, 'Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    const downloadFile = async (file) => {
        try {
            console.log('📥 Downloading file:', file.name);
            
            // For non-protected files, get download URL from backend
            if (!file.isProtected) {
                const token = getToken();
                const response = await axios.get(`${API_BASE_URL}/files/download/${file.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.data.downloadUrl) {
                    // Open the presigned S3 URL to download the file
                    window.open(response.data.downloadUrl, '_blank');
                    console.log('✅ Download initiated');
                }
            }
            // Protected files are handled by FileItem component with password prompt
            
        } catch (error) {
            console.error('❌ Download failed:', error);
            showError(error, 'Download failed');
        }
    };

    const handleFileDelete = () => {
        fetchFiles(); // Refresh after delete
    };

    const handleShareCreated = () => {
        // Optional: Show success message or refresh if needed
        console.log('Share link created successfully');
    };

    // Filter and Sort files based on active tab and search term
    const getProcessedFiles = () => {
        let processed = [...files];

        // Search filter
        if (searchTerm) {
            processed = processed.filter(file =>
                file.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Tab-specific logic
        switch (activeTab) {
            case 'recent':
                // Sort newest first
                processed.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
                break;
            case 'shared':
                // Only show files the user has actually created a share link for
                processed = processed.filter(file => sharedFileIds.includes(file.id));
                break;
            default:
                break;
        }

        return processed;
    };

    const filteredFiles = getProcessedFiles();

    useEffect(() => {
        fetchFiles();
    }, []);

    return (
        <div className="file-explorer">
            {loading ? (
                <div className="loading">Loading files...</div>
            ) : (
                <div className="files-grid">
                    {filteredFiles.length > 0 ? (
                        filteredFiles.map(file => (
                            <FileItem 
                                key={file.id}
                                file={file}
                                onDelete={handleFileDelete}
                                onDownload={() => downloadFile(file)}
                                onShareCreated={handleShareCreated}
                            />
                        ))
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">
                                Empty
                            </div>
                            <p>
                                {searchTerm 
                                    ? `No files found for "${searchTerm}"`
                                    : 'No files content yet'
                                }
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FileExplorer;