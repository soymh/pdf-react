import React, { useState, useEffect, useRef } from 'react';

function CreateWorkspaceModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content">
        <h3>🚀 CREATE NEW WORKSPACE 🚀</h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter workspace name..."
          maxLength="50"
        />
        <div className="modal-actions">
          <button className="cyber-button" onClick={handleConfirm}>CREATE</button>
          <button className="cyber-button" onClick={onCancel}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;
