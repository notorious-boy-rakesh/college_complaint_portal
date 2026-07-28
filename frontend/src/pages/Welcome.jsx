import { useNavigate } from 'react-router-dom';

const Welcome = () => {
    const navigate = useNavigate();

    return (
        <div className="page active" style={{ minHeight: 'calc(100vh - 80px)', display: 'block' }}>
            <div className="hero-section">
                <div className="hero-content">
                    <h1 className="gradient-text">Welcome to College Complaint Portal</h1>
                    <p className="subtitle">A platform to voice your concerns and improve campus life</p>

                    <div className="features-grid">
                        <div className="feature-card">
                            <i className="fas fa-comment-dots"></i>
                            <h3>File Complaints</h3>
                            <p>Submit your concerns easily with categorized options</p>
                        </div>
                        <div className="feature-card">
                            <i className="fas fa-chart-line"></i>
                            <h3>Track Status</h3>
                            <p>Monitor your complaint resolution progress in real-time</p>
                        </div>
                        <div className="feature-card">
                            <i className="fas fa-robot"></i>
                            <h3>AI Powered</h3>
                            <p>Smart features for better complaint management</p>
                        </div>
                    </div>

                    <div className="cta-buttons">
                        <button onClick={() => navigate('/login')} className="btn btn-primary">Login</button>
                        <button onClick={() => navigate('/signup')} className="btn btn-secondary">Sign Up</button>
                    </div>
                </div>

                <div className="hero-image">
                    <div className="floating-shapes">
                        <div className="shape shape-1"></div>
                        <div className="shape shape-2"></div>
                        <div className="shape shape-3"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
