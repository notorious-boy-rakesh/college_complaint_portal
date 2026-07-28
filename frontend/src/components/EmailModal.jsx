import { useState } from 'react';
import axios from 'axios';

const EmailModal = ({ isOpen, onClose, complaint, toastRef }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [drafting, setDrafting] = useState(false);

    if (!isOpen || !complaint) return null;

    // Use a derived state pattern or set initial in parent, 
    // but standard React flow is fine here with input value override logic
    const toEmail = `${complaint.regNumber}@gmail.com`;

    const handleDraftWithAI = async () => {
        setDrafting(true);
        setBody('Thinking... AI is generating a professional draft...');
        try {
            const res = await axios.post('/api/ai/draft-email', { complaintId: complaint.id });
            setBody(res.data.result || 'Generation failed.');
        } catch (e) {
            setBody('Failed to connect to AI.');
        }
        setDrafting(false);
    };

    const handleSend = async () => {
        if (!subject || !body) {
            toastRef.current?.show('Please fill subject and message fields', 'error');
            return;
        }

        try {
            await axios.post('/admin/mail/send', {
                toRegNumber: complaint.regNumber,
                subject,
                body
            });
            toastRef.current?.show(`Email delivered to ${toEmail}!`);
            onClose();
        } catch (e) {
            toastRef.current?.show('Failed to send email', 'error');
        }
    };

    return (
        <div className="ai-modal" style={{ display: 'flex' }}>
            <div className="ai-modal-content" style={{ maxWidth: '600px' }}>
                <span className="ai-close" onClick={onClose}>&times;</span>
                <h3><i className="fas fa-envelope"></i> Send Email to Student</h3>
                
                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>To:</label>
                    <input type="text" readOnly value={toEmail} style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }} />
                </div>
                
                <div className="form-group">
                    <label>Subject:</label>
                    <input type="text" placeholder="Email subject line" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
                
                <div className="form-group">
                    <label>Message:</label>
                    <textarea rows="6" placeholder="Write your email here..." value={body} onChange={e => setBody(e.target.value)}></textarea>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <button className="btn btn-secondary" onClick={handleDraftWithAI} disabled={drafting}>
                        <i className="fas fa-magic"></i> {drafting ? 'Drafting...' : 'Draft with AI'}
                    </button>
                    <button className="btn btn-primary" onClick={handleSend}>
                        <i className="fas fa-paper-plane"></i> Send Email
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailModal;
