import React, { useState, useEffect, useRef } from 'react';
import './styles/cyber-button.css'
function CreateSpaceModal({ onConfirm, onCancel }) {
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
        <h3>⚡ CREATE NEW SPACE ⚡</h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter space name..."
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

export default CreateSpaceModal;
