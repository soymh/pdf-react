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
  onMoveCapturesBetweenPages // Add this new prop
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
      className={`spaces-panel ${isExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="spaces-header">
        <span>🎯 SPACES</span>
        <button className="cyber-button" onClick={onCreateSpace} style={{ padding: '5px 10px', fontSize: '12px' }}>
          ➕ ADD
        </button>
      </div>
      <div className="spaces-list" id="spacesList">
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
              onMoveCapturesBetweenPages={onMoveCapturesBetweenPages} // Pass the new prop
              isDragging={isDragging}
              setIsDragging={setIsDragging}
            />
          ))
        ) : (
          <div className="empty-state">
            <p>Create spaces to organize your captures</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpacesPanel;