import React, { useState, useRef, useEffect } from 'react';

function Header({ onLoadClick, onCreateSpace, onCreateWorkspace, onClearAll, isZenMode }) {
  const [isDragging, setIsDragging] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const handleDragStart = (e) => {
      // Check if the drag started from a capture thumbnail
      if (e.target.classList.contains('capture-thumbnail')) {
        setIsDragging(true);
      }
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
    };
  }, []);

  return (
    <div 
      ref={headerRef}
      className={`header fixed top-0 left-0 right-0 z-30 bg-cyber-blue/90 border-b-2 border-cyber-purple backdrop-blur-lg shadow-cyber transition-transform duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] cursor-pointer flex items-center justify-start h-[70px] ${
        isDragging ? 'translate-y-0' : ''
      }`}
    >
      <div className="logo">
        ⚡ PDF WORKSPACE ⚡
      </div>
      <div className="controls flex gap-[15px] items-center flex-nowrap absolute left-1/2 -translate-x-[calc(50%-60px)]">
        <button className="bg-gradient-to-br from-[#533483] to-[#9333ea] border border-cyber-purple text-cyber-light py-[10px] px-[20px] cursor-pointer uppercase tracking-[1px] transition-all duration-300 relative overflow-hidden rounded-xl hover:-translate-y-0.5 active:translate-y-0" onClick={onLoadClick}>📥 LOAD PDF</button>
        <button className="bg-gradient-to-br from-[#533483] to-[#9333ea] border border-cyber-purple text-cyber-light py-[10px] px-[20px] cursor-pointer uppercase tracking-[1px] transition-all duration-300 relative overflow-hidden rounded-xl hover:-translate-y-0.5 active:translate-y-0" onClick={onCreateSpace}>✨ NEW SPACE</button>
        <button className="bg-gradient-to-br from-[#533483] to-[#9333ea] border border-cyber-purple text-cyber-light py-[10px] px-[20px] cursor-pointer uppercase tracking-[1px] transition-all duration-300 relative overflow-hidden rounded-xl hover:-translate-y-0.5 active:translate-y-0" onClick={onCreateWorkspace}>➕ NEW WORKSPACE</button>
        <button className="bg-gradient-to-br from-[#533483] to-[#9333ea] border border-cyber-purple text-cyber-light py-[10px] px-[20px] cursor-pointer uppercase tracking-[1px] transition-all duration-300 relative overflow-hidden rounded-xl hover:-translate-y-0.5 active:translate-y-0" onClick={onClearAll}>🗑️ CLEAR ALL</button>
      </div>
    </div>
  );
}

export default Header;