import { useState, useEffect } from 'react';
import axios from 'axios';

const StudentModal = ({ isOpen, onClose, toastRef, refreshTrigger }) => {
    const [students, setStudents] = useState([]);

    useEffect(() => {
        if (isOpen) {
            loadStudents();
        }
    }, [isOpen, refreshTrigger]);

    const loadStudents = async () => {
        try {
            const res = await axios.get('/admin/students');
            setStudents(res.data);
        } catch (e) {
            // handle silently or via toast
        }
    };

    const deleteStudent = async (regNumber) => {
        if (!window.confirm(`Are you sure you want to permanently delete student ${regNumber} and all their complaints?`)) return;
        
        try {
            await axios.delete(`/admin/student/${regNumber}`);
            toastRef.current?.show('Student deleted successfully');
            loadStudents();
        } catch (e) {
            toastRef.current?.show('Failed to delete student', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="ai-modal" style={{ display: 'flex' }}>
            <div className="ai-modal-content" style={{ maxWidth: '700px' }}>
                <span className="ai-close" onClick={onClose}>&times;</span>
                <h3><i className="fas fa-users"></i> Student List</h3>
                <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Reg Number</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(s => (
                                <tr key={s.regNumber}>
                                    <td>{s.name}</td>
                                    <td>{s.regNumber}<br/><small style={{color: '#b0b0b0'}}>{s.regNumber}@gmail.com</small></td>
                                    <td>
                                        <button className="btn btn-small" style={{ background: '#f44336', color: 'white', border: 'none' }} onClick={() => deleteStudent(s.regNumber)}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {students.length === 0 && (
                                <tr><td colSpan="3" style={{textAlign: 'center'}}>No students found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentModal;
