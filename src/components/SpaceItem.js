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
  onDeleteCapture,
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
      <div className="bg-cyber-blue/80 border border-cyber-purple/40 rounded-lg backdrop-blur-lg shadow-[0_8px_32px_rgba(147,51,234,0.2)] animate-fadeInUp animation-forwards mb-[15px]">
        <div className="flex justify-between items-center p-[15px] border-b-2 border-cyber-purple shadow-[0_2px_10px_rgba(0,0,0,0.3)] cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <span className="text-base text-cyber-light font-bold max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap text-shadow-purple">{space.name} ({getTotalCaptures()})</span>
          <div className="flex gap-[5px] items-center flex-nowrap" onClick={(e) => e.stopPropagation()}>
            <button 
              className={`w-[35px] h-[35px] rounded-[15px] cursor-pointer flex items-center justify-center text-sm transition-all duration-300 min-w-[35px] ${isActive ? 'bg-cyber-purple pulse' : 'bg-cyber-purple/40'} border border-cyber-purple text-cyber-light p-[8px_12px] font-bold`}
              onClick={() => onSetActive(space.id)}
              title={isActive ? 'This is the active space' : 'Set as active space'}
            >
              {isActive ? '★' : '☆'}
            </button>
            <button 
              className="w-[35px] h-[35px] rounded-[15px] cursor-pointer flex items-center justify-center text-sm transition-all duration-300 min-w-[35px] bg-cyber-purple/30 border border-cyber-purple text-cyber-light p-[8px_12px] font-bold hover:bg-cyber-purple/70 hover:shadow-[0_0_15px_rgba(147,51,234,0.6)] hover:scale-105"
              onClick={() => setEditingPage({ open: true, initialPageIndex: 0 })}
              title="Edit Pages Layout"
            >
              ✎
            </button>
            <button className="w-[35px] h-[35px] rounded-[15px] cursor-pointer flex items-center justify-center text-sm transition-all duration-300 min-w-[35px] bg-cyber-purple/40 border border-cyber-purple text-cyber-light p-[8px_12px] font-bold hover:bg-cyber-purple/70 hover:shadow-[0_0_15px_rgba(147,51,234,0.6)] hover:scale-105" onClick={() => onExport(space.id)} title="Export as PDF">PDF</button>
            <button className="w-[35px] h-[35px] rounded-[15px] cursor-pointer flex items-center justify-center text-sm transition-all duration-300 min-w-[35px] bg-[linear-gradient(45deg,rgba(220,38,127,0.4),rgba(190,24,93,0.6))] border border-cyber-purple text-cyber-light p-[8px_12px] font-bold hover:bg-[linear-gradient(45deg,rgba(220,38,127,0.7),rgba(190,24,93,0.8))] hover:shadow-[0_0_15px_rgba(147,51,234,0.6)] hover:scale-105" onClick={() => onDelete(space.id)} title="Delete Space">✕</button>
          </div>
        </div>
        {isExpanded && (
          <div className={`space-content active p-[15px] bg-cyber-dark/40 border-2 border-cyber-purple/30 rounded-xl mb-[20px] transition-all duration-300 ${isExpanded ? 'block' : 'hidden'}`}>
            <div className="w-full mb-[10px] bg-cyber-blue/60 border border-dashed border-cyber-purple p-[8px] text-center cursor-pointer transition-all duration-300 rounded-xl hover:bg-cyber-purple/20 hover:border-solid" onClick={() => onAddNewPage(space.id)}>
              ➕ Add New Page
            </div>
            
            {space.pages && space.pages.length > 0 ? (
              space.pages.map((page, pageIndex) => (
                <div key={page.id} className="bg-cyber-dark/20 border border-cyber-purple/20 rounded-md mb-[15px] p-[10px]">
                  <div className="flex justify-between items-center mb-[10px] pb-[8px] border-b border-cyber-purple/20">
                    <span className="text-xs text-cyber-light/80 font-bold">Page {pageIndex + 1} ({page.captures.length})</span>
                    <div className="flex gap-[5px]">
                      <button 
                        className="w-[30px] h-[30px] rounded-[15px] cursor-pointer flex items-center justify-center text-sm transition-all duration-300 bg-cyber-purple/30 border border-cyber-purple text-cyber-light p-[4px] font-bold hover:bg-cyber-purple/70 hover:shadow-[0_0_15px_rgba(147,51,234,0.6)] hover:scale-105"
                        onClick={() => setEditingPage({ open: true, initialPageIndex: pageIndex })}
                        title="Edit Page Layout"
                      >
                        ✎
                      </button>
                      {space.pages.length > 1 && (
                        <button 
                          className="w-[30px] h-[30px] rounded-[15px] cursor-pointer flex items-center justify-center text-sm transition-all duration-300 bg-[rgba(220,38,127,0.3)] border border-cyber-purple text-cyber-light p-[4px] font-bold hover:bg-[rgba(239,68,68,1)] hover:shadow-[0_0_15px_rgba(220,38,127,0.5)] hover:scale-110 hover:transform"
                          onClick={() => onDeletePage(space.id, page.id)}
                          title="Delete Page"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-[8px] min-h-[80px] p-[8px] border-2 border-dashed border-cyber-purple/30 rounded border-cyber-purple/5 transition-all duration-300" data-page-id={page.id}>
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
                          className="relative overflow-hidden rounded-lg border-2 border-cyber-purple/30 bg-white p-[4px] shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all duration-300 w-full h-[80px] object-cover cursor-grab"
                          data-id={capture.id}
                          id={capture.id.toString()}
                        >
                          <img
                            src={capture.imageData}
                            className="w-full h-full object-contain rounded cursor-grab transition-transform duration-200 border-2 border-transparent"
                            alt="Captured snippet"
                            title={`From: ${capture.source}, Page: ${capture.page} - Click to zoom`}
                            draggable={true}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCaptureClick(capture);
                            }}
                          />
                          <button
                            className="absolute top-[5px] right-[5px] w-[20px] h-[20px] rounded-full cursor-pointer flex items-center justify-center text-xs font-bold transition-all duration-200 z-[10] shadow-[0_0_5px_rgba(0,0,0,0.2)] bg-[rgba(220,38,127,0.9)] border border-white/30 text-white opacity-0 hover:opacity-100 hover:bg-[rgba(239,68,68,1)] hover:scale-110 hover:shadow-[0_0_15px_rgba(220,38,127,0.5)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to delete this capture?')) {
                                onDeleteCapture(space.id, page.id, capture.id);
                              }
                            }}
                            title="Delete Capture"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </ReactSortable>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-cyber-light/70 p-[40px] font-italic bg-cyber-purple/5 border-2 border-dashed border-cyber-purple/30 rounded-xl m-[20px]">
                <p>No pages yet. Capture something to get started!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Screen Editor Portal */}
      {editingPage.open && createPortal(
        <div className="fixed top-0 left-0 w-full h-full z-[999999] flex flex-col animate-overlayFadeIn isolate">
          <div className="fixed top-0 left-0 w-full h-full bg-black/95 backdrop-blur-lg z-[-1] m-0 !important p-0 !important transform-none !important rounded-none !important shadow-none !important" />
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