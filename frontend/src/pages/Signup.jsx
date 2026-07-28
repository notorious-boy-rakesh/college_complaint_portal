import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Signup = ({ toastRef }) => {
    const [formData, setFormData] = useState({ name: '', regNumber: '', password: '', confirmPassword: '' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            toastRef.current?.show('Passwords do not match', 'error');
            return;
        }

        try {
            const res = await axios.post('/signup', {
                name: formData.name,
                regNumber: formData.regNumber,
                password: formData.password
            });
            toastRef.current?.show(res.data.message || 'Signup successful');
            navigate('/login');
        } catch (error) {
            toastRef.current?.show(error.response?.data?.message || 'Signup failed', 'error');
        }
    };

    return (
        <div className="page active auth-container" style={{ display: 'flex' }}>
            <div className="auth-card">
                <div className="auth-header">
                    <h2 className="gradient-text">Create Student Account</h2>
                    <p>Join the complaint portal</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label><i className="fas fa-user"></i> Full Name</label>
                        <input 
                            type="text" 
                            placeholder="Enter your full name" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><i className="fas fa-id-card"></i> Register Number</label>
                        <input 
                            type="text" 
                            placeholder="Format: 9204XXXXXXXX" 
                            pattern="9204[0-9]{8}"
                            value={formData.regNumber}
                            onChange={(e) => setFormData({...formData, regNumber: e.target.value})}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><i className="fas fa-lock"></i> Password</label>
                        <input 
                            type="password" 
                            placeholder="Create a strong password" 
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><i className="fas fa-lock"></i> Confirm Password</label>
                        <input 
                            type="password" 
                            placeholder="Confirm your password" 
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block">
                        <i className="fas fa-user-plus"></i> Create Account
                    </button>

                    <div className="auth-links">
                        <p>Already have an account? <Link to="/login" className="text-link">Login</Link></p>
                        <p><Link to="/" className="text-link"><i className="fas fa-arrow-left"></i> Back to Home</Link></p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Signup;
