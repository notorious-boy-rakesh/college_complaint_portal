const AIModal = ({ isOpen, onClose, title, content, loading }) => {
    if (!isOpen) return null;

    return (
        <div className="ai-modal" style={{ display: 'flex' }}>
            <div className="ai-modal-content">
                <span className="ai-close" onClick={onClose}>&times;</span>
                <h3><i className="fas fa-robot"></i> {title}</h3>
                <div className="ai-modal-body" style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
                    {loading ? (
                        <div style={{ color: 'var(--text-dim)' }}>Thinking...</div>
                    ) : (
                        content
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIModal;
