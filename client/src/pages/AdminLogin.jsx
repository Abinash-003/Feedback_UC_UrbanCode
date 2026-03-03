import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../api.config';
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff, MdOutlineAutoAwesome, MdOutlineAnalytics, MdOutlineInsights, MdOutlineCategory, MdOutlinePsychology } from 'react-icons/md';
import './AdminLogin.css';

const AdminLogin = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    useEffect(() => {
        document.title = "UC-feedback form login";
    }, []);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
            localStorage.setItem('token', res.data.token);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Moving Background Icons */}
            <div className="bg-bubbles">
                <MdOutlineAutoAwesome className="bubble icon-1" />
                <MdOutlineAnalytics className="bubble icon-2" />
                <MdOutlineInsights className="bubble icon-3" />
                <MdOutlineCategory className="bubble icon-4" />
                <MdOutlinePsychology className="bubble icon-5" />
            </div>

            <div className="login-card glass">
                <div className="login-header">
                    <div className="logo-box">
                        <span className="logo-text">urbancode<span className="logo-bracket">{'>'}</span></span>
                        <p className="logo-sub">training and solutions</p>
                    </div>
                    <h2 className="zen-title">UC-feedback form login</h2>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="modern-input-group">
                        <div className="input-with-icon">
                            <MdPerson className="input-icon" />
                            <input
                                type="text"
                                name="username"
                                value={credentials.username}
                                onChange={handleChange}
                                required
                                placeholder="Username"
                            />
                        </div>
                    </div>

                    <div className="modern-input-group">
                        <div className="input-with-icon">
                            <MdLock className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={credentials.password}
                                onChange={handleChange}
                                required
                                placeholder="Password"
                            />
                            <button
                                type="button"
                                className="toggle-pass"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="zen-login-btn" disabled={loading}>
                        {loading ? <span className="loader"></span> : 'SIGN IN'}
                    </button>

                    <div className="login-footer">
                        <p>© 2026 UrbanCode. All rights reserved.</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
