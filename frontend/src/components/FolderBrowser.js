import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '../utils/auth';
import FileItem from './FileItem';
import './FolderBrowser.css';

function FolderBrowser({ currentFolder, onFolderSelect, onFileSelect, onFileDelete }) {
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [breadcrumbs, setBreadcrumbs] = useState([]);

    const fetchFolderContents = async (folderId = null) => {
        try {
            setLoading(true);
            let url = 'http://localhost:5000/api/files/my-files';
            
            if (folderId) {
                url = `http://localhost:5000/api/folders/${folderId}/contents`;
            }

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            console.log('📁 Folder contents:', response.data);

            if (folderId) {
                // Folder contents
                setFiles(response.data.files || []);
                setFolders(response.data.subfolders || []);
            } else {
                // Root level
                setFiles(response.data || []);
                setFolders([]);
            }

        } catch (error) {
            console.error('❌ Error fetching contents:', error);
        } finally {
            setLoading(false);
        }
    };

    // Reset breadcrumbs when currentFolder changes
    useEffect(() => {
        if (currentFolder) {
            // If we're entering a new folder, add it to breadcrumbs
            setBreadcrumbs(prev => {
                // Check if folder is already in breadcrumbs
                const existingIndex = prev.findIndex(f => f.id === currentFolder.id);
                if (existingIndex >= 0) {
                    return prev.slice(0, existingIndex + 1);
                }
                return [...prev, currentFolder];
            });
        } else {
            // Root level
            setBreadcrumbs([]);
        }
        
        fetchFolderContents(currentFolder?.id);
    }, [currentFolder]);

    const handleFolderClick = (folder) => {
        console.log('📁 Folder clicked:', folder);
        if (onFolderSelect) {
            onFolderSelect(folder);
        }
    };

    const handleBreadcrumbClick = (index) => {
        console.log('🍞 Breadcrumb clicked:', index);
        if (index === -1) {
            // Root level
            if (onFolderSelect) onFolderSelect(null);
        } else {
            // Navigate to specific breadcrumb
            const targetFolder = breadcrumbs[index];
            if (onFolderSelect) onFolderSelect(targetFolder);
        }
    };

    const handleFileDelete = (file) => {
        console.log('🗑️ File deleted:', file.name);
        if (onFileDelete) {
            onFileDelete();
        }
        fetchFolderContents(currentFolder?.id);
    };

    return (
        <div className="folder-browser">
            {/* Breadcrumbs */}
            <div className="breadcrumbs">
                <button 
                    onClick={() => handleBreadcrumbClick(-1)}
                    className="breadcrumb-item"
                >
                    🏠 Root
                </button>
                {breadcrumbs.map((folder, index) => (
                    <React.Fragment key={folder.id}>
                        <span className="breadcrumb-separator">›</span>
                        <button 
                            onClick={() => handleBreadcrumbClick(index)}
                            className="breadcrumb-item"
                        >
                            {folder.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* Current Location */}
            <div className="current-location">
                <h3>
                    {currentFolder ? `📁 ${currentFolder.name}` : '🏠 All Files'}
                </h3>
                <p>
                    {folders.length} folders • {files.length} files
                </p>
            </div>

            {loading ? (
                <div className="loading">🔄 Loading contents...</div>
            ) : (
                <>
                    {/* Folders Grid */}
                    {folders.length > 0 && (
                        <div className="section">
                            <h4>📂 Folders ({folders.length})</h4>
                            <div className="folders-grid">
                                {folders.map(folder => (
                                    <div 
                                        key={folder._id || folder.id}
                                        className="folder-item"
                                        onClick={() => handleFolderClick(folder)}
                                    >
                                        <div className="folder-icon">
                                            {folder.isProtected ? '🔒' : '📁'}
                                        </div>
                                        <div className="folder-info">
                                            <h5>{folder.name}</h5>
                                            <p>Click to open</p>
                                            {folder.isProtected && (
                                                <div className="protected-badge">Password Protected</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Files List */}
                    {files.length > 0 && (
                        <div className="section">
                            <h4>📄 Files ({files.length})</h4>
                            <div className="files-list">
                                {files.map(file => (
                                    <FileItem 
                                        key={file._id || file.id}
                                        file={file}
                                        onDelete={handleFileDelete}
                                        onDownload={onFileSelect}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {folders.length === 0 && files.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">📭</div>
                            <p>This folder is empty</p>
                            <p>Upload files or create subfolders to get started!</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default FolderBrowser;