import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './Login.css';

const Register = ({ onRegister }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.username.trim()) newErrors.username = 'Username is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                if (onRegister) onRegister();
                navigate('/dashboard');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Registration failed. Please try again.');
            }
        } catch (err) {
            setError('Registration failed. Please try again.');
            console.error('Registration error:', err);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <h1>Create Account</h1>
                    <p>Join SkyStore today</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Username:</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Choose a username"
                            className={errors.username ? 'error' : ''}
                        />
                        {errors.username && <div className="error-message">{errors.username}</div>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            className={errors.email ? 'error' : ''}
                        />
                        {errors.email && <div className="error-message">{errors.email}</div>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Password (min 6 characters):</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create a password"
                            className={errors.password ? 'error' : ''}
                        />
                        {errors.password && <div className="error-message">{errors.password}</div>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password:</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            className={errors.confirmPassword ? 'error' : ''}
                        />
                        {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
                    </div>
                    
                    <div className="form-group checkbox-group">
                        <input
                            type="checkbox"
                            id="showPasswordRegister"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                        />
                        <label htmlFor="showPasswordRegister">Show Passwords</label>
                    </div>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <button type="submit" className="login-btn">
                        Create Account
                    </button>
                    
                    <div className="register-link">
                        Already have an account? <span onClick={() => navigate('/login')}>Sign in</span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
