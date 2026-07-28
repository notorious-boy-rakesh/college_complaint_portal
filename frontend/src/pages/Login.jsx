import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = ({ toastRef }) => {
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const [formData, setFormData] = useState({ regNumber: '', username: '', password: '' });
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = isAdminLogin 
            ? { username: formData.username, password: formData.password }
            : { regNumber: formData.regNumber, password: formData.password };
            
        const result = await login(payload, isAdminLogin);
        
        if (result.success) {
            toastRef.current?.show('Login successful');
            navigate('/dashboard');
        } else {
            toastRef.current?.show(result.message, 'error');
        }
    };

    return (
        <div className="page active auth-container" style={{ display: 'flex' }}>
            <div className="auth-card">
                <div className="auth-header">
                    <h2 className="gradient-text">{isAdminLogin ? 'Admin Login' : 'Student Login'}</h2>
                    <p>{isAdminLogin ? 'Access administrative dashboard' : 'Access your complaint dashboard'}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="toggle-login-type">
                        <button type="button" className={`toggle-btn ${!isAdminLogin ? 'active' : ''}`} onClick={() => setIsAdminLogin(false)}>Student</button>
                        <button type="button" className={`toggle-btn ${isAdminLogin ? 'active' : ''}`} onClick={() => setIsAdminLogin(true)}>Admin</button>
                    </div>

                    {!isAdminLogin ? (
                        <div className="form-group">
                            <label><i className="fas fa-id-card"></i> Register Number</label>
                            <input 
                                type="text" 
                                placeholder="Enter 12-digit number" 
                                value={formData.regNumber} 
                                onChange={(e) => setFormData({...formData, regNumber: e.target.value})}
                                required
                            />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label><i className="fas fa-user"></i> Admin Username</label>
                            <input 
                                type="text" 
                                placeholder="Enter admin username" 
                                value={formData.username} 
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label><i className="fas fa-lock"></i> Password</label>
                        <input 
                            type="password" 
                            placeholder="Enter your password" 
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block">
                        <i className="fas fa-sign-in-alt"></i> Login
                    </button>

                    <div className="auth-links">
                        <p>Don't have an account? <Link to="/signup" className="text-link">Sign Up</Link></p>
                        <p><Link to="/" className="text-link"><i className="fas fa-arrow-left"></i> Back to Home</Link></p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
