import React from 'react';
import './FileSearch.css';

function FileSearch({ searchTerm, onSearchChange }) {
    return (
        <div className="file-search">
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search files by name"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="search-input"
                />
                {searchTerm && (
                    <button 
                        onClick={() => onSearchChange('')}
                        className="clear-search"
                        title="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}

export default FileSearch;