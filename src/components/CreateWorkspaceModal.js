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
    <div className="fixed top-0 left-0 w-full h-full bg-black/80 z-[1000] backdrop-blur-sm" style={{ display: 'block' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyber-blue/95 border-2 border-cyber-purple rounded-xl p-[30px] min-w-[400px] shadow-[0_20px_60px_rgba(147,51,234,0.4)]">
        <h3 className="text-cyber-light mb-5 text-center text-shadow-purple">🚀 CREATE NEW WORKSPACE 🚀</h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter workspace name..."
          maxLength="50"
          className="w-full p-3 bg-cyber-blue/80 border border-cyber-purple text-cyber-light rounded-lg mb-5 font-fira focus:outline-none focus:shadow-[0_0_15px_rgba(147,51,234,0.5)]"
        />
        <div className="flex gap-[15px] justify-center">
          <button className="bg-gradient-to-br from-[#533483] to-[#9333ea] border border-cyber-purple text-cyber-light py-[10px] px-[20px] cursor-pointer uppercase tracking-[1px] transition-all duration-300 relative overflow-hidden rounded-xl hover:-translate-y-0.5 active:translate-y-0" onClick={handleConfirm}>CREATE</button>
          <button className="bg-gradient-to-br from-[#533483] to-[#9333ea] border border-cyber-purple text-cyber-light py-[10px] px-[20px] cursor-pointer uppercase tracking-[1px] transition-all duration-300 relative overflow-hidden rounded-xl hover:-translate-y-0.5 active:translate-y-0" onClick={onCancel}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;