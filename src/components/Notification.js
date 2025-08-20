import React, { useState, useEffect } from 'react';

function Notification({ message, type }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true); // Trigger fade-in animation
  }, []);

  const typeClasses = {
    success: 'bg-[rgba(34,197,94,0.95)]',
    error: 'bg-[rgba(239,68,68,0.95)]',
    warning: 'bg-[rgba(245,158,11,0.95)]',
    info: 'bg-[rgba(83,52,131,0.95)]',
  };

  return (
    <div
      className={`fixed top-5 right-5 border border-cyber-purple rounded-lg p-[15px] text-cyber-light z-[1001] shadow-[0_10px_30px_rgba(147,51,234,0.4)] transition-transform duration-300 ${visible ? 'translate-x-0' : 'translate-x-full'} ${typeClasses[type] || typeClasses.info}`}
      style={{ marginBottom: '10px' }}
    >
      {message}
    </div>
  );
}

export default Notification;