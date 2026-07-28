import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const StudentDashboard = ({ toastRef }) => {
    const { currentUser, logout } = useContext(AuthContext);
    const [complaints, setComplaints] = useState([]);
    const [formData, setFormData] = useState({ category: '', title: '', details: '' });

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        try {
            const res = await axios.get('/complaints/my');
            setComplaints(res.data);
        } catch (error) {
            if (error.response?.status === 401) logout();
        }
    };

    const submitComplaint = async () => {
        if (!formData.category || !formData.title || !formData.details) {
            toastRef.current?.show('Fill all fields', 'error');
            return;
        }

        try {
            await axios.post('/complaint', formData);
            toastRef.current?.show('Complaint submitted');
            setFormData({ category: '', title: '', details: '' });
            loadComplaints();
        } catch (error) {
            if (error.response?.status === 401) logout();
            toastRef.current?.show('Failed to submit', 'error');
        }
    };

    return (
        <div className="page active dashboard" style={{ display: 'block' }}>
            <div className="dashboard-header">
                <h2 className="gradient-text">Student Complaint Dashboard</h2>
                <div className="user-profile">
                    <div className="profile-info">
                        <span className="username">{currentUser?.name}</span>
                        <span className="role">{currentUser?.regNumber}@gmail.com</span>
                    </div>
                </div>
            </div>

            <div className="complaint-section">
                <div className="complaint-form">
                    <h3><i className="fas fa-edit"></i> File New Complaint</h3>
                    <div className="form-group">
                        <label><i className="fas fa-tags"></i> Category</label>
                        <select className="form-select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                            <option value="">Select Category</option>
                            <option value="infrastructure">Infrastructure</option>
                            <option value="hostel">Hostel Facilities</option>
                            <option value="cafeteria">Food</option>
                            <option value="transport">Transport</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label><i className="fas fa-heading"></i> Title</label>
                        <input type="text" placeholder="Brief title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label><i className="fas fa-comment"></i> Details</label>
                        <textarea rows="6" placeholder="Describe in detail..." value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}></textarea>
                    </div>
                    <button onClick={submitComplaint} className="btn btn-primary"><i className="fas fa-paper-plane"></i> Submit</button>
                </div>

                <div className="complaint-status">
                    <h3><i className="fas fa-history"></i> My Complaints</h3>
                    <div className="status-list">
                        {complaints.length === 0 ? (
                            <div className="no-complaints">
                                <i className="fas fa-inbox"></i><p>No complaints filed yet</p>
                            </div>
                        ) : complaints.map(c => (
                            <div key={c.id} className={`complaint-item ${c.status}`}>
                                <h4>{c.title}</h4>
                                <p>{c.details}</p>
                                <span className={`status-badge status-${c.status}`}>{c.status.toUpperCase()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
