import React, { useState, useRef, useEffect } from 'react';
import './styles/body.css';


function Header({ onLoadClick, onCreateSpace, onCreateWorkspace, onClearAll, isZenMode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const headerRef = useRef(null);
  const expandTimeoutRef = useRef(null);


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

      }, 300);
    }
  };


  useEffect(() => {
    const handleDragStart = (e) => {
      setIsDragging(true);
      setIsExpanded(true);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };


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
                <button className="cyber-button" onClick={onLoadClick}>📥 LOAD PDF</button>
                <button className="cyber-button" onClick={onCreateSpace}>✨ NEW SPACE</button>
                <button className="cyber-button" onClick={onCreateWorkspace}>➕ NEW WORKSPACE</button>
                <button className="cyber-button" onClick={onClearAll}>🗑️ CLEAR ALL</button>
      </div>
    </div>
  );
}

export default Header;