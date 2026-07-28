import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const AdminDashboard = ({ toastRef }) => {
    const { logout } = useContext(AuthContext);
    const [complaints, setComplaints] = useState([]);
    const [hideResolved, setHideResolved] = useState(false);

    useEffect(() => {
        loadComplaints();
    }, [hideResolved]);

    const loadComplaints = async () => {
        try {
            const res = await axios.get('/admin/complaints');
            let data = res.data;
            if (hideResolved) {
                data = data.filter(c => c.status !== 'resolved');
            }
            setComplaints(data);
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) logout();
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`/admin/complaint/${id}`, { status });
            loadComplaints();
        } catch (error) {
            toastRef.current?.show('Failed to update status', 'error');
        }
    };

    const markAllResolved = async () => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await axios.put('/admin/complaints/resolve-all');
            toastRef.current?.show('All marked resolved');
            loadComplaints();
        } catch (e) {
            toastRef.current?.show('Action failed', 'error');
        }
    };

    const deleteAll = async () => {
        if (!window.confirm("WARNING: Delete ALL complaints?")) return;
        try {
            await axios.delete('/admin/complaints');
            toastRef.current?.show('All complaints deleted');
            loadComplaints();
        } catch (e) {
            toastRef.current?.show('Action failed', 'error');
        }
    };

    return (
        <div className="page active dashboard" style={{ display: 'block' }}>
            <div className="dashboard-header">
                <h2 className="gradient-text">Admin Dashboard</h2>
            </div>

            <div className="admin-stats">
                <div className="stat-card">
                    <i className="fas fa-exclamation-circle"></i>
                    <h3>{complaints.length}</h3>
                    <p>Total Shown</p>
                </div>
            </div>

            <div className="admin-content">
                <div className="complaints-table">
                    <h3><i className="fas fa-list"></i> Complaints</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Student</th>
                                    <th>Category</th>
                                    <th>Title</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.map(c => (
                                    <tr key={c.id}>
                                        <td>#{c.id}</td>
                                        <td>{c.studentName}<br/><small>{c.regNumber}</small></td>
                                        <td>{c.category}</td>
                                        <td>{c.title}</td>
                                        <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                                        <td>
                                            {c.status !== 'resolved' && (
                                                <button className="btn btn-small" onClick={() => updateStatus(c.id, 'resolved')}><i className="fas fa-check"></i></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="admin-sidebar">
                    <div className="quick-actions">
                        <h3><i className="fas fa-bolt"></i> Quick Actions</h3>
                        <button className="btn btn-action" onClick={() => setHideResolved(!hideResolved)}>
                            {hideResolved ? "Show All" : "Hide Resolved"}
                        </button>
                        <button className="btn btn-action" onClick={markAllResolved}>Mark All Resolved</button>
                        <button className="btn btn-action" style={{borderColor: 'red', color: 'red'}} onClick={deleteAll}>Delete All Complaints</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
