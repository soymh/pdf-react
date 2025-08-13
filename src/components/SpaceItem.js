import React, { useState } from 'react';
import { ReactSortable } from 'react-sortablejs';
import { createPortal } from 'react-dom';
import PageEditor from './PageEditor';

function SpaceItem({ 
  space, 
  isActive, 
  onSetActive, 
  onDelete, 
  onExport, 
  onUpdateCaptures, 
  onCaptureMove,
  onAddNewPage, 
  onDeletePage, 
  onMoveCapturesBetweenPages,
  isDragging, 
  setIsDragging 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomedCapture, setZoomedCapture] = useState(null);
  const [editingPage, setEditingPage] = useState({ open: false, initialPageIndex: 0 });

  const handleSortEnd = (evt) => {
    const { from, to, newIndex, item } = evt;
    const fromPageId = from.dataset.pageId;
    const toPageId = to.dataset.pageId;
    const captureId = item.dataset.id;

    if (fromPageId !== toPageId && captureId) {
      onMoveCapturesBetweenPages(space.id, captureId, fromPageId, toPageId, newIndex);
    }
    
    if (setIsDragging) setIsDragging(false);
  };

  const handleCaptureAdd = (newCaptures, pageId, sortable, evt) => {
    if (evt && evt.originalEvent) {
      evt.originalEvent.stopPropagation();
    }

    onUpdateCaptures(space.id, pageId, newCaptures);
  };

  const getTotalCaptures = () => {
    return space.pages ? space.pages.reduce((sum, page) => sum + page.captures.length, 0) : 0;
  };

  const handleCaptureClick = (capture) => {
    setZoomedCapture(capture);
  };

  const closeZoom = () => {
    setZoomedCapture(null);
  };

  const handleZoomOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeZoom();
    }
  };
  
  return (
    <>
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
            <button 
              className="space-btn" 
              onClick={() => setEditingPage({ open: true, initialPageIndex: 0 })}
              title="Edit Pages Layout"
              style={{ background: 'rgba(147, 51, 234, 0.3)' }}
            >
              ✎
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
                      <button 
                        className="space-btn" 
                        onClick={() => setEditingPage({ open: true, initialPageIndex: pageIndex })}
                        title="Edit Page Layout"
                        style={{ background: 'rgba(147, 51, 234, 0.3)' }}
                      >
                        ✎
                      </button>
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
                  
                  <div className="capture-grid" data-page-id={page.id}>
                    <ReactSortable
                      list={page.captures}
                      setList={(newCaptures) => onUpdateCaptures(space.id, page.id, newCaptures)}
                      animation={150}
                      ghostClass="sortable-ghost"
                      chosenClass="sortable-chosen"
                      group="shared-captures"
                      onStart={() => setIsDragging && setIsDragging(true)}
                      onEnd={handleSortEnd}
                      forceFallback={true}
                      fallbackClass="sortable-fallback"
                    >
                      {page.captures.map((capture, index) => (
                        <div key={`${page.id}-${capture.id}`} className="capture-thumbnail-container" data-id={capture.id}>
                          <img
                            data-id={capture.id}
                            src={capture.imageData}
                            className="capture-thumbnail"
                            alt="Captured snippet"
                            title={`From: ${capture.source}, Page: ${capture.page} - Click to zoom`}
                            draggable={true}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCaptureClick(capture);
                            }}
                          />
                        </div>
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

      {/* Zoom Modal */}
      {zoomedCapture && (
        <div className="zoom-overlay" onClick={handleZoomOverlayClick}>
          <img
            src={zoomedCapture.imageData}
            className="capture-thumbnail-zoom"
            alt="Zoomed capture"
          />
          <div 
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: 'rgba(147, 51, 234, 0.9)',
              color: 'white',
              padding: '10px 15px',
              borderRadius: '8px',
              cursor: 'pointer',
              zIndex: 1001,
              fontSize: '18px',
              fontWeight: 'bold'
            }}
            onClick={closeZoom}
          >
            ✕
          </div>
          <div 
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '20px',
              fontSize: '14px'
            }}
          >
            From: {zoomedCapture.source} | Page: {zoomedCapture.page} | Click outside to close
          </div>
        </div>
      )}

      <button 
        className="space-btn" 
        onClick={() => setEditingPage(space)}
        title="Edit Pages Layout"
        style={{ background: 'rgba(147, 51, 234, 0.3)' }}
      >
        ✎
      </button>
      
      {/* Full Screen Editor Portal */}
      {editingPage.open && createPortal(
        <div className="editor-overlay">
          <div className="editor-backdrop" />
          <PageEditor
            space={space}
            onClose={() => setEditingPage({ open: false, initialPageIndex: 0 })}
            onSave={(updatedPage) => {
              onUpdateCaptures(space.id, updatedPage);
              setEditingPage({ open: false, initialPageIndex: 0 });
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}

export default SpaceItem;