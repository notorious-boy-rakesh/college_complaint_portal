import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = ({ unreadCount, openInbox }) => {
    const { currentUser, isAdmin, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <i className="fas fa-graduation-cap"></i>
                <span>College Complaint Portal</span>
            </div>
            
            <div className="nav-links">
                {!currentUser ? (
                    <>
                        <Link to="/" className="nav-btn">Home</Link>
                        <Link to="/login" className="nav-btn">Login</Link>
                    </>
                ) : (
                    <>
                        <Link to="/dashboard" className="nav-btn">Dashboard</Link>
                        <button onClick={handleLogout} className="nav-btn btn-logout">Logout</button>
                    </>
                )}
            </div>

            {currentUser && !isAdmin && (
                <div className="notif-bell" onClick={openInbox}>
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
