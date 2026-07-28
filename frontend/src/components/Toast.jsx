import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const Toast = forwardRef((props, ref) => {
    const [toast, setToast] = useState({ message: '', type: 'success', show: false });

    useImperativeHandle(ref, () => ({
        show(message, type = 'success') {
            setToast({ message, type, show: true });
            setTimeout(() => {
                setToast((prev) => ({ ...prev, show: false }));
            }, 3000);
        }
    }));

    return (
        <div className={`toast ${toast.show ? 'show' : ''}`} style={{ backgroundColor: toast.type === 'error' ? '#f44336' : undefined }}>
            {toast.message}
        </div>
    );
});

export default Toast;
