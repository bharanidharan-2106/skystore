import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getToken } from '../utils/auth';
import FileItem from './FileItem';
import FileSearch from './FileSearch';
import { showError } from '../utils/errorHandler';
import './FileExplorer.css';

function FileExplorer() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const token = getToken();
            
            const response = await axios.get(`${API_BASE_URL}/files/my-files`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('📁 Files:', response.data);
            setFiles(response.data.files || []);

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

    // Filter files based on search
    const filteredFiles = files.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        fetchFiles();
    }, []);

    return (
        <div className="file-explorer">
            <div className="explorer-header">
                <h2>📁 My Files</h2>
                <button onClick={fetchFiles} disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {/* Search Component */}
            <FileSearch 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
            />

            {loading ? (
                <div className="loading">🔄 Loading files...</div>
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
                                {searchTerm ? '🔍' : '📭'}
                            </div>
                            <p>
                                {searchTerm 
                                    ? `No files found for "${searchTerm}"`
                                    : 'No files uploaded yet'
                                }
                            </p>
                            <p>
                                {searchTerm 
                                    ? 'Try a different search term'
                                    : 'Upload your first file using the upload form'
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