import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import AIModal from '../components/AIModal';
import EmailModal from '../components/EmailModal';
import StudentModal from '../components/StudentModal';

const AdminDashboard = ({ toastRef }) => {
    const { logout } = useContext(AuthContext);
    const [complaints, setComplaints] = useState([]);
    const [hideResolved, setHideResolved] = useState(false);
    const [activeStudentsCount, setActiveStudentsCount] = useState(0);

    // AI Modal State
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiTitle, setAiTitle] = useState('');
    const [aiContent, setAiContent] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // Email Modal State
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);

    // Student Modal State
    const [studentModalOpen, setStudentModalOpen] = useState(false);

    useEffect(() => {
        loadComplaints();
        loadStudentCount();
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

    const loadStudentCount = async () => {
        try {
            const res = await axios.get('/admin/students');
            setActiveStudentsCount(res.data.length);
        } catch (e) {
            // silent
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
        if (!window.confirm("Are you sure you want to mark all complaints as resolved?")) return;
        try {
            await axios.put('/admin/complaints/resolve-all');
            toastRef.current?.show('All marked resolved');
            loadComplaints();
        } catch (e) {
            toastRef.current?.show('Action failed', 'error');
        }
    };

    const deleteAll = async () => {
        if (!window.confirm("WARNING: Are you sure you want to completely erase ALL complaints from the live database? This action cannot be undone.")) return;
        try {
            await axios.delete('/admin/complaints');
            toastRef.current?.show('All complaints deleted');
            loadComplaints();
        } catch (e) {
            toastRef.current?.show('Action failed', 'error');
        }
    };

    const exportPDF = async () => {
        try {
            toastRef.current?.show('Generating PDF...', 'info');
            const res = await axios.get('/admin/complaints/export/pdf', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'complaints_report.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (e) {
            toastRef.current?.show('Failed to export PDF', 'error');
        }
    };

    const openAI = async (endpoint, title, body = {}) => {
        setAiTitle(title);
        setAiContent('');
        setAiLoading(true);
        setAiModalOpen(true);
        try {
            const res = await axios.post(`/api/ai/${endpoint}`, body);
            setAiContent(res.data.result || "No response");
        } catch (e) {
            setAiContent("Failed to connect to AI Service.");
        }
        setAiLoading(false);
    };

    const openEmail = (complaint) => {
        setSelectedComplaint(complaint);
        setEmailModalOpen(true);
    };

    // Calculate Stats
    const totalComplaints = complaints.length;
    const pendingComplaints = complaints.filter(c => c.status === 'pending').length;
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;

    return (
        <div className="page active dashboard" style={{ display: 'block' }}>
            <div className="dashboard-header">
                <h2 className="gradient-text">Admin Dashboard</h2>
            </div>

            <div className="admin-stats">
                <div className="stat-card">
                    <i className="fas fa-exclamation-circle"></i>
                    <h3>{totalComplaints}</h3>
                    <p>Total Complaints</p>
                </div>
                <div className="stat-card">
                    <i className="fas fa-clock"></i>
                    <h3>{pendingComplaints}</h3>
                    <p>Pending</p>
                </div>
                <div className="stat-card">
                    <i className="fas fa-check-circle"></i>
                    <h3>{resolvedComplaints}</h3>
                    <p>Resolved</p>
                </div>
                <div className="stat-card">
                    <i className="fas fa-users"></i>
                    <h3>{activeStudentsCount}</h3>
                    <p>Active Students</p>
                </div>
            </div>

            <div className="admin-content">
                <div className="complaints-table">
                    <h3><i className="fas fa-list"></i> All Complaints</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Student</th>
                                    <th>Category</th>
                                    <th>Title</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.map(c => (
                                    <tr key={c.id}>
                                        <td>#{c.id}</td>
                                        <td>{c.studentName}<br/><small style={{color: '#b0b0b0'}}>{c.regNumber}@gmail.com</small></td>
                                        <td>{c.category}</td>
                                        <td>{c.title}</td>
                                        <td>{new Date(c.date).toLocaleDateString()}</td>
                                        <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                {c.status !== 'resolved' && (
                                                    <button className="btn btn-small" onClick={() => updateStatus(c.id, 'resolved')}><i className="fas fa-check"></i></button>
                                                )}
                                                <button className="btn btn-small btn-secondary" onClick={() => openEmail(c)}>
                                                    <i className="fas fa-envelope"></i> Mail
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="admin-sidebar">
                    <div className="ai-admin-features">
                        <h3><i className="fas fa-robot"></i> AI Admin Tools</h3>
                        
                        <div className="ai-tool-card">
                            <i className="fas fa-chart-bar"></i>
                            <h4>Monthly Report</h4>
                            <p>AI generates comprehensive monthly complaint reports</p>
                            <button className="btn btn-small" onClick={() => openAI('monthly-report', 'Monthly AI Analysis Report')}>
                                <i className="fas fa-file-pdf"></i> Generate Report
                            </button>
                        </div>
                        
                        <div className="ai-tool-card">
                            <i className="fas fa-mail-bulk"></i>
                            <h4>Bulk Email</h4>
                            <p>AI drafts email responses to multiple complaints</p>
                            <button className="btn btn-small" onClick={() => openAI('draft-email', 'Draft Response for Pending Complaint')}>
                                <i className="fas fa-envelope"></i> Draft Emails
                            </button>
                        </div>
                        
                        <div className="ai-tool-card">
                            <i className="fas fa-filter"></i>
                            <h4>Similarity Check</h4>
                            <p>AI identifies and groups similar complaints</p>
                            <button className="btn btn-small" onClick={() => openAI('group-complaints', 'AI Complaint Grouping')}>
                                <i className="fas fa-object-group"></i> Group Complaints
                            </button>
                        </div>
                    </div>

                    <div className="quick-actions">
                        <h3><i className="fas fa-bolt"></i> Quick Actions</h3>
                        <button className="btn btn-action" style={{ background: 'rgba(244, 67, 54, 0.2)', color: '#f44336', borderColor: '#f44336' }} onClick={deleteAll}>
                            <i className="fas fa-trash-alt"></i> Delete All Complaints
                        </button>
                        <button className="btn btn-action" onClick={() => setHideResolved(!hideResolved)}>
                            <i className="fas fa-filter"></i> {hideResolved ? "Show All" : "Hide Resolved"}
                        </button>
                        <button className="btn btn-action" onClick={markAllResolved}>
                            <i className="fas fa-check-double"></i> Mark All Resolved
                        </button>
                        <button className="btn btn-action" onClick={exportPDF}>
                            <i className="fas fa-download"></i> Export Data
                        </button>
                        <button className="btn btn-action" onClick={() => setStudentModalOpen(true)}>
                            <i className="fas fa-user-graduate"></i> View Students
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AIModal 
                isOpen={aiModalOpen} 
                onClose={() => setAiModalOpen(false)} 
                title={aiTitle} 
                content={aiContent} 
                loading={aiLoading} 
            />
            
            <EmailModal 
                isOpen={emailModalOpen} 
                onClose={() => setEmailModalOpen(false)} 
                complaint={selectedComplaint} 
                toastRef={toastRef} 
            />
            
            <StudentModal 
                isOpen={studentModalOpen} 
                onClose={() => setStudentModalOpen(false)} 
                toastRef={toastRef} 
                refreshTrigger={activeStudentsCount} 
            />
        </div>
    );
};

export default AdminDashboard;
