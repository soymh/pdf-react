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
  onAddNewPage,
  onDeletePage,
  onMoveCapturesBetweenPages,
  isDragging,
  setIsDragging,
  onZoomCapture,
  onCloseZoom,
  showNotification,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingPage, setEditingPage] = useState({ open: false, initialPageIndex: 0 });

  const handleSortEnd = (evt) => {
    const { from, to, newIndex, item } = evt;

    console.log('--- handleSortEnd Debugging ---');
    console.log('evt object:', evt);
    console.log('evt.from (DOM element):', from);
    console.log('evt.to (DOM element):', to);
    console.log('evt.item (Dragged DOM element):', item);

    const fromPageId = from ? from.closest('[data-page-id]')?.dataset.pageId : 'undefined_from';
    const toPageId = to ? to.closest('[data-page-id]')?.dataset.pageId : 'undefined_to';
    const captureId = item ? (item.id || item.dataset.id) : 'undefined_capture';

    console.log('Resolved fromPageId:', fromPageId);
    console.log('Resolved toPageId:', toPageId);
    console.log('Resolved captureId:', captureId);
    console.log('newIndex:', newIndex);

    if (fromPageId !== 'undefined_from' && toPageId !== 'undefined_to' && fromPageId !== toPageId && captureId !== 'undefined_capture') {
      console.log('CONDITION MET: Calling onMoveCapturesBetweenPages...');
      if (toPageId === '') {
          console.log('WARNING: toPageId is empty string. This might still be an issue with target list ID resolution.');
      }
      onMoveCapturesBetweenPages(space.id, captureId, fromPageId, toPageId, newIndex);
    } else {
      console.log('CONDITION NOT MET. Not a cross-page move or missing data.');
    }
    
    if (setIsDragging) setIsDragging(false);
  };

  const getTotalCaptures = () => {
    if (Array.isArray(space.pages)) {
      return space.pages.reduce((sum, page) => sum + (page.captures ? page.captures.length : 0), 0);
    }
    console.warn(`Space ${space.id} (${space.name}): space.pages is not an array. Current value:`, space.pages);
    return 0;
  };

  const handleCaptureClick = (capture) => {
    onZoomCapture(capture);
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
                  
                  {/* IMPORTANT: Put data-page-id back on the parent div here */}
                  <div className="capture-grid" data-page-id={page.id}>
                    <ReactSortable
                      list={page.captures}
                      setList={(newCaptures, sortable) => {
                        if (!sortable) {
                          console.warn("ReactSortable setList: 'sortable' object is null or undefined, skipping update.");
                          return;
                        }
                        const parentPageElement = sortable.el.closest('[data-page-id]');
                        const parentPageId = parentPageElement ? parentPageElement.dataset.pageId : null;
                        if (parentPageId === page.id.toString()) {
                          const updatedPage = { ...page, captures: newCaptures };
                          onUpdateCaptures(space.id, updatedPage);
                        }
                      }}
                      animation={150}
                      ghostClass="sortable-ghost"
                      chosenClass="sortable-chosen"
                      group={{ name: "shared-captures", pull: true, put: true }}
                      onStart={() => setIsDragging && setIsDragging(true)}
                      onEnd={handleSortEnd}
                      forceFallback={true}
                      fallbackClass="sortable-fallback"
                    >
                      {page.captures.map((capture, index) => (
                        <div
                          key={capture.id}
                          className="capture-thumbnail-container"
                          data-id={capture.id}
                          id={capture.id.toString()}
                        >
                          <img
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

      {/* Full Screen Editor Portal */}
      {editingPage.open && createPortal(
        <div className="editor-overlay">
          <div className="editor-backdrop" />
          <PageEditor
            space={space}
            onClose={() => setEditingPage({ open: false, initialPageIndex: 0 })}
            onSave={(updatedPages) => {
              onUpdateCaptures(space.id, updatedPages);
              // Removed: setEditingPage({ open: false, initialPageIndex: 0 });
            }}
            initialPageIndex={editingPage.initialPageIndex}
            showNotification={showNotification}
          />
        </div>,
        document.body
      )}
    </>
  );
}

export default SpaceItem;