import React, { useState, useRef, useEffect } from 'react';

function Header({ onLoadClick, onCreateSpace, onClearAll, isZenMode, toggleZenMode }) { // NEW: isZenMode and toggleZenMode props
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const headerRef = useRef(null);
  const expandTimeoutRef = useRef(null);

  // Handle header expansion/collapse
  const handleMouseEnter = () => {
    if (!isDragging) {
      clearTimeout(expandTimeoutRef.current);
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      expandTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 300); // Small delay to prevent flickering
    }
  };

  // Global drag event listeners (similar to SpacesPanel)
  useEffect(() => {
    const handleDragStart = (e) => {
      setIsDragging(true);
      setIsExpanded(true);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    // Listen to global drag events
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      clearTimeout(expandTimeoutRef.current);
    };
  }, []);

  return (
    <div 
      ref={headerRef}
      className={`header ${isExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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
        {/* NEW: Zen Mode Toggle Button */}
        <button className="cyber-button" onClick={toggleZenMode} title={isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"}>
          <span>{isZenMode ? '😌 Exit Zen' : '🧘 Zen Mode'}</span>
        </button>
      </div>
    </div>
  );
}

export default Header;