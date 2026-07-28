import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext, useRef } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

const ProtectedRoute = ({ children, adminOnly }) => {
    const { currentUser, isAdmin } = useContext(AuthContext);
    
    if (!currentUser) return <Navigate to="/login" />;
    if (adminOnly && !isAdmin) return <Navigate to="/dashboard" />;
    
    return children;
};

const DashboardRouter = ({ toastRef }) => {
    const { isAdmin } = useContext(AuthContext);
    return isAdmin ? <AdminDashboard toastRef={toastRef} /> : <StudentDashboard toastRef={toastRef} />;
};

const AppContent = () => {
    const toastRef = useRef();

    return (
        <Router>
            <Navbar />
            <div className="container">
                <Routes>
                    <Route path="/" element={<Welcome />} />
                    <Route path="/login" element={<Login toastRef={toastRef} />} />
                    <Route path="/signup" element={<Signup toastRef={toastRef} />} />
                    <Route 
                        path="/dashboard" 
                        element={
                            <ProtectedRoute>
                                <DashboardRouter toastRef={toastRef} />
                            </ProtectedRoute>
                        } 
                    />
                </Routes>
            </div>
            <Toast ref={toastRef} />
        </Router>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
