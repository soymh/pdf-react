import React, { useState } from 'react';
import { ReactSortable } from 'react-sortablejs';

function SpaceItem({ space, isActive, onSetActive, onDelete, onExport, onUpdateCaptures }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSortEnd = (newCaptures) => {
    // react-sortablejs updates the list in place, so we just pass it up
    onUpdateCaptures(space.id, newCaptures);
  };
  
  return (
    <div className="space-item">
      <div className="space-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="space-name">{space.name} ({space.captures?.length || 0})</span>
        <div className="space-actions" onClick={(e) => e.stopPropagation()}>
          <button 
            className={`space-btn ${isActive ? 'pulse' : ''}`}
            onClick={() => onSetActive(space.id)}
            style={isActive ? { background: '#9333ea' } : {}}
            title={isActive ? 'This is the active space' : 'Set as active space'}
          >
            {isActive ? '★' : '☆'}
          </button>
          <button className="space-btn" onClick={() => onExport(space.id)} title="Export as PDF">PDF</button>
          <button className="space-btn" onClick={() => onDelete(space.id)} title="Delete Space">✕</button>
        </div>
      </div>
      {isExpanded && (
        <div className="space-content active">
            {space.captures && space.captures.length > 0 ? (
                <ReactSortable
                    list={space.captures}
                    setList={handleSortEnd}
                    animation={150}
                    ghostClass="sortable-ghost"
                    chosenClass="sortable-chosen"
                >
                    {space.captures.map(capture => (
                        <img
                            key={capture.id}
                            src={capture.imageData}
                            className="captured-image"
                            alt="Captured snippet"
                            title={`From: ${capture.source}, Page: ${capture.page}`}
                        />
                    ))}
                </ReactSortable>
            ) : (
                <div className="empty-state"><p>No captures yet</p></div>
            )}
        </div>
      )}
    </div>
  );
}

export default SpaceItem;
