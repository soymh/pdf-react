import React, { useState, useEffect } from 'react';

function Notification({ message, type }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true); // Trigger fade-in animation
  }, []);

  const colors = {
    success: 'rgba(34, 197, 94, 0.95)',
    error: 'rgba(239, 68, 68, 0.95)',
    warning: 'rgba(245, 158, 11, 0.95)',
    info: 'rgba(83, 52, 131, 0.95)',
  };

  return (
    <div
      className={`notification ${visible ? 'show' : ''}`}
      style={{ background: colors[type] || colors.info, marginBottom: '10px' }}
    >
      {message}
    </div>
  );
}

export default Notification;
