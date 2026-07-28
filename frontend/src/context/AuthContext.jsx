import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
        ? "http://localhost:3004" 
        : "https://college-complaint-backend.onrender.com";

    axios.defaults.baseURL = API_URL;

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('currentUser');
        const adminStatus = localStorage.getItem('isAdmin');

        if (token && user) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setCurrentUser(JSON.parse(user));
            setIsAdmin(adminStatus === 'true');
        }
        setLoading(false);
    }, []);

    const login = async (payload, isAdminLogin) => {
        try {
            const res = await axios.post('/login', { ...payload, isAdmin: isAdminLogin });
            const data = res.data;
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('isAdmin', data.user.role === 'admin');
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            setCurrentUser(data.user);
            setIsAdmin(data.user.role === 'admin');
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAdmin');
        delete axios.defaults.headers.common['Authorization'];
        setCurrentUser(null);
        setIsAdmin(false);
    };

    if (loading) return null;

    return (
        <AuthContext.Provider value={{ currentUser, isAdmin, login, logout, API_URL }}>
            {children}
        </AuthContext.Provider>
    );
};
