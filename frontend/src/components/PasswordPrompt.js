import React, { useState } from 'react';
import axios from 'axios';
import { getToken } from '../utils/auth';
import './PasswordPrompt.css';

function PasswordPrompt({ file, isOpen, onClose, onSuccess }) {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!password) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `http://localhost:5000/api/files/${file._id}/verify`,
                { password },
                {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    }
                }
            );

            if (response.data.success) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="password-prompt-overlay">
            <div className="password-prompt">
                <h3>🔒 Protected File</h3>
                <p>Enter password to access: <strong>{file.name}</strong></p>
                
                <form onSubmit={handleVerify}>
                    <input
                        type="password"
                        placeholder="Enter file password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="button-group">
                        <button type="button" onClick={onClose} className="cancel-btn">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="verify-btn">
                            {isLoading ? 'Verifying...' : 'Verify'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PasswordPrompt;