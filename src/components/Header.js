import React from 'react';

function Header({ onLoadClick, onCreateSpace, onClearAll }) {
  return (
    <div className="header">
      <div className="logo">⚡ PDF WORKSPACE ⚡</div>
      <div className="controls">
        <button className="cyber-button" onClick={onLoadClick}>
          <span>📂 LOAD PDFs</span>
        </button>
        <button className="cyber-button" onClick={onCreateSpace}>
          <span>🗂️ NEW SPACE</span>
        </button>
        <button className="cyber-button" onClick={onClearAll}>
          <span>🗑️ CLEAR ALL</span>
        </button>
      </div>
    </div>
  );
}

export default Header;
