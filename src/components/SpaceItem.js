import React, { useState } from 'react';
import { ReactSortable } from 'react-sortablejs';

function SpaceItem({ 
  space, 
  isActive, 
  onSetActive, 
  onDelete, 
  onExport, 
  onUpdateCaptures, 
  onCaptureMove, // Add this prop
  onAddNewPage, 
  onDeletePage, 
  isDragging, 
  setIsDragging 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSortEnd = (newCaptures, pageId) => {
    onUpdateCaptures(space.id, pageId, newCaptures);
  };

  const handleCaptureAdd = (newCaptures, pageId, evt) => {
    // This handles when a capture is added to this page (from another page)
    if (evt.from !== evt.to) {
      // Cross-page move detected
      const movedCapture = newCaptures.find(capture => 
        capture.id === evt.item.getAttribute('data-id')
      );
      if (movedCapture && onCaptureMove) {
        onCaptureMove(space.id, pageId, newCaptures, movedCapture);
        return;
      }
    }
    // Regular same-page reorder
    onUpdateCaptures(space.id, pageId, newCaptures);
  };

  const getTotalCaptures = () => {
    return space.pages ? space.pages.reduce((sum, page) => sum + page.captures.length, 0) : 0;
  };
  
  return (
    <div className="space-item">
      <div className="space-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="space-name">{space.name} ({getTotalCaptures()})</span>
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
          {/* Add New Page Button */}
          <div className="add-page-btn" onClick={() => onAddNewPage(space.id)}>
            ➕ Add New Page
          </div>
          
          {space.pages && space.pages.length > 0 ? (
            space.pages.map((page, pageIndex) => (
              <div key={page.id} className="page-container">
                <div className="page-header">
                  <span className="page-title">Page {pageIndex + 1} ({page.captures.length})</span>
                  <div className="space-actions">
                    {space.pages.length > 1 && (
                      <button 
                        className="space-btn" 
                        onClick={() => onDeletePage(space.id, page.id)}
                        title="Delete Page"
                        style={{ background: 'rgba(220, 38, 127, 0.3)' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="capture-grid">
                  <ReactSortable
                    list={page.captures}
                    setList={(newCaptures, sortable, evt) => handleCaptureAdd(newCaptures, page.id, evt)}
                    animation={150}
                    ghostClass="sortable-ghost"
                    chosenClass="sortable-chosen"
                    group={{
                      name: `space-${space.id}`, // Unique group per space
                      pull: true,
                      put: true
                    }}
                    onStart={() => setIsDragging && setIsDragging(true)}
                    onEnd={() => setIsDragging && setIsDragging(false)}
                    forceFallback={true}
                    fallbackClass="sortable-fallback"
                  >
                    {page.captures.map(capture => (
                      <img
                        key={capture.id}
                        data-id={capture.id} // Add data-id for tracking
                        src={capture.imageData}
                        className="capture-thumbnail"
                        alt="Captured snippet"
                        title={`From: ${capture.source}, Page: ${capture.page}`}
                        draggable={true}
                      />
                    ))}
                  </ReactSortable>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No pages yet. Capture something to get started!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SpaceItem;