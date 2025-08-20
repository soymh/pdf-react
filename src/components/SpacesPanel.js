import React, { useState, useRef, useEffect } from 'react';
import SpaceItem from './SpaceItem';

function SpacesPanel({ 
  spaces, 
  activeSpaceId, 
  onCreateSpace, 
  onSetActiveSpace, 
  onDeleteSpace, 
  onExportSpace, 
  onUpdateCaptures,
  onAddNewPage,
  onDeletePage,
  onMoveCapturesBetweenPages,
  onZoomCapture,
  onCloseZoom,
  showNotification,
  onDeleteCapture, // NEW: Prop for deleting a specific capture
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);
  const expandTimeoutRef = useRef(null);

  // Handle panel expansion/collapse
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

  // Global drag event listeners
  useEffect(() => {
    const handleDragStart = (e) => {
      // Check if the drag started from a capture thumbnail
      if (e.target.classList.contains('capture-thumbnail')) {
        setIsDragging(true);
        setIsExpanded(true);
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      // Don't auto-collapse after drag ends, let user decide
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
      ref={panelRef}
      className={`spaces-panel ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex justify-between items-center p-[15px] text-cyber-light border-b border-cyber-purple/40">
        <span className="font-oxanium font-bold text-shadow-purple">🎯 SPACES</span>
        <button className="bg-gradient-to-br from-[#533483] to-[#9333ea] border border-cyber-purple text-cyber-light py-[5px] px-[10px] cursor-pointer uppercase tracking-[1px] transition-all duration-300 relative overflow-hidden rounded-xl text-[12px] hover:-translate-y-0.5 active:translate-y-0" onClick={onCreateSpace}>
          ➕ ADD
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-[10px]" id="spacesList">
        {spaces.length > 0 ? (
          spaces.map(space => (
            <SpaceItem
              key={space.id}
              space={space}
              isActive={space.id === activeSpaceId}
              onSetActive={onSetActiveSpace}
              onDelete={onDeleteSpace}
              onExport={onExportSpace}
              onUpdateCaptures={onUpdateCaptures}
              onAddNewPage={onAddNewPage}
              onDeletePage={onDeletePage}
              onMoveCapturesBetweenPages={onMoveCapturesBetweenPages}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              onZoomCapture={onZoomCapture}
              onCloseZoom={onCloseZoom}
              showNotification={showNotification}
              onDeleteCapture={onDeleteCapture} // NEW: Pass it down
            />
          ))
        ) : (
          <div className="text-center text-cyber-light/60 p-[40px] font-italic bg-cyber-purple/5 border-2 border-dashed border-cyber-purple/30 rounded-xl m-[20px]">
            <p>Create spaces to organize your captures</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpacesPanel;