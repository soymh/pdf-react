import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import './PageEditor.css';

function PageEditor({ space, onClose, onSave, initialPageIndex = 0, showNotification }) {
  // A4 dimensions and scaling constants
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MM_TO_PX = 96/25.4 // 1mm = 72/25.4 pixels (72 DPI is standard for PDF)
  const [currentPageIndex, setCurrentPageIndex] = useState(initialPageIndex);
  const [pages, setPages] = useState(space.pages.map(page => ({
    ...page,
    captures: page.captures.map(capture => {
      // Calculate A4 center point
      const A4_WIDTH_PX = A4_WIDTH_MM * MM_TO_PX;
      const A4_HEIGHT_PX = A4_HEIGHT_MM * MM_TO_PX;

      const defaultPosition = {
        x: (A4_WIDTH_PX / 2) - ((capture.originalSize?.width || 200) / 2),
        y: (A4_HEIGHT_PX / 2) - ((capture.originalSize?.height || 200) / 2)
      };

      return {
        ...capture,
        position: capture.position || defaultPosition,
        scale: capture.scale || { x: 1, y: 1 },
        rotation: capture.rotation || 0,
        originalSize: capture.originalSize || { width: 200, height: 200 }
      };
    })
  })));
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Handle capture selection
  const handleCaptureClick = (e, captureId) => {
    e.stopPropagation();
    setSelectedCapture(captureId);
  };

  // Start dragging a capture
  const handleMouseDown = (e, captureId) => {
    e.stopPropagation();
    if (e.target.classList.contains('resize-handle')) return;
    if (e.target.classList.contains('rotate-handle')) return;
    
    setIsDragging(true);
    setSelectedCapture(captureId);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    const capture = pages[currentPageIndex].captures.find(c => c.id === captureId);
    setInitialTransform({
      position: { ...capture.position },
    });
  };

  // Start resizing a capture
  const handleResizeStart = (e, captureId, handle) => {
    e.stopPropagation();
    setIsResizing(true);
    setSelectedCapture(captureId);
    
    const capture = pages[currentPageIndex].captures.find(c => c.id === captureId);
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      handle,
      initialWidth: rect.width,
      initialHeight: rect.height,
      aspectRatio: rect.width / rect.height
    });
    
    setInitialTransform({
      scale: { ...capture.scale },
      position: { ...capture.position }
    });
  };

  // Start rotating a capture
  const handleRotateStart = (e, captureId) => {
    e.stopPropagation();
    setIsRotating(true);
    setSelectedCapture(captureId);
    
    const capture = pages[currentPageIndex].captures.find(c => c.id === captureId);
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      centerX,
      centerY,
      initialRotation: capture.rotation || 0
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging && !isResizing && !isRotating) return;

      if (isDragging) {
        const s = (canvasDimensions?.scale || 1);
        const deltaX = (e.clientX - dragStart.x) / s;
        const deltaY = (e.clientY - dragStart.y) / s;

        setPages(prev => prev.map((page, index) => {
          if (index !== currentPageIndex) return page;
          return {
            ...page,
            captures: page.captures.map(capture => {
              if (capture.id !== selectedCapture) return capture;
              return {
                ...capture,
                position: {
                  x: initialTransform.position.x + deltaX,
                  y: initialTransform.position.y + deltaY
                }
              };
            })
          };
        }));
      }

      if (isResizing) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        setPages(prev => prev.map((page, index) => {
          if (index === currentPageIndex) {
            return {
              ...page,
              captures: page.captures.map(capture => {
                if (capture.id === selectedCapture) {
                  let newScale = { ...initialTransform.scale };
                  const { handle, initialWidth, initialHeight } = dragStart;

                // Calculate size changes based on handle position
                  switch(handle) {
                    case 'se':
                      newScale.x = initialTransform.scale.x * (1 + deltaX / initialWidth);
                      newScale.y = initialTransform.scale.y * (1 + deltaY / initialHeight);
                      break;
                    case 'sw':
                      newScale.x = initialTransform.scale.x * (1 - deltaX / initialWidth);
                      newScale.y = initialTransform.scale.y * (1 + deltaY / initialHeight);
                      break;
                    case 'ne':
                      newScale.x = initialTransform.scale.x * (1 + deltaX / initialWidth);
                      newScale.y = initialTransform.scale.y * (1 - deltaY / initialHeight);
                      break;
                    case 'nw':
                      newScale.x = initialTransform.scale.x * (1 - deltaX / initialWidth);
                      newScale.y = initialTransform.scale.y * (1 - deltaY / initialHeight);
                      break;
                    default:
                      break;
                  }

                // Ensure minimum scale (keep your existing guards above)
                  newScale.x = Math.max(0.1, newScale.x);
                  newScale.y = Math.max(0.1, newScale.y);

                // Convert screen-px diffs to A4-space px
                  const s = (canvasDimensions?.scale || 1);
                  const widthDiffScreen  = (initialWidth  * newScale.x) - (initialWidth  * initialTransform.scale.x);
                  const heightDiffScreen = (initialHeight * newScale.y) - (initialHeight * initialTransform.scale.y);

                  let positionDelta = { x: 0, y: 0 };
                  if (handle.includes('w')) positionDelta.x =  widthDiffScreen  / s;
                  if (handle.includes('n')) positionDelta.y =  heightDiffScreen / s;

                  return {
                    ...capture,
                    scale: newScale,
                    position: {
                      x: initialTransform.position.x - positionDelta.x,
                      y: initialTransform.position.y - positionDelta.y
                    }
                  };
                }
                return capture;
              })
            };
          }
          return page;
        }));
      }

      if (isRotating) {
        const { centerX, centerY, initialRotation } = dragStart;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const startAngle = Math.atan2(dragStart.y - centerY, dragStart.x - centerX);
        const rotation = initialRotation + (angle - startAngle) * (180 / Math.PI);

        setPages(prev => prev.map((page, index) => {
          if (index === currentPageIndex) {
            return {
              ...page,
              captures: page.captures.map(capture => {
                if (capture.id === selectedCapture) {
                  return {
                    ...capture,
                    rotation
                  };
                }
                return capture;
              })
            };
          }
          return page;
        }));
      }
  };

    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDragging || isResizing || isRotating) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, isRotating, canvasDimensions, currentPageIndex, dragStart, initialTransform, selectedCapture]);

  // Handle click outside to deselect
  const handleContainerClick = (e) => {
    if (e.target === containerRef.current) {
      setSelectedCapture(null);
    }
  };

  // Save changes
  const nextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
      setSelectedCapture(null);
    }
  };

  const previousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      setSelectedCapture(null);
    }
  };

  // Function to handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = document.querySelector('.page-editor-canvas');
      if (canvas) {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const padding = 200;
        let width = A4_WIDTH_MM * MM_TO_PX;
        let height = A4_HEIGHT_MM * MM_TO_PX;
        
        const scaleW = (vw - padding) / width;
        const scaleH = (vh - padding) / height;
        const scale = Math.min(scaleW, scaleH, 0.8);
        
        width *= scale;
        height *= scale;
        
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.dataset.scale = scale.toString();
        setCanvasDimensions({ width, height, scale });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [A4_WIDTH_MM, A4_HEIGHT_MM, MM_TO_PX]);
  const captureCanvasContent = async () => {
    const canvasElement = canvasRef.current;
    if (canvasElement) {
      // Temporarily hide scrollbars if they appear due to overflow
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const canvas = await html2canvas(canvasElement, {
        scale: 2, // Increase scale for higher resolution
        useCORS: true, // Important for images loaded from different origins
        logging: true,
        backgroundColor: '#1a1a1a', // Match editor background or transparent
      });
      document.body.style.overflow = originalOverflow; // Restore overflow

      return canvas.toDataURL('image/png'); // Get image as Data URL
    }
    return null;
  };

  const handleApplyCurrentPage = async () => {
      setSelectedCapture(null); // Deselect any active capture before saving
      await new Promise(resolve => setTimeout(resolve, 50)); // Allow re-render

      const renderedImage = await captureCanvasContent();

      const updatedPage = {
        ...pages[currentPageIndex],
        renderedImage: renderedImage,
      };

      // Update local state
      setPages(prev => {
        const newPages = [...prev];
        newPages[currentPageIndex] = updatedPage;
        return newPages;
      });

      // Persist to global state (App.js)
      onSave(updatedPage);
      showNotification('success', 'Current page applied!');
  };

  const handleSave = async () => {
    // This now saves all pages
    showNotification('info', 'Saving all changes...');

    const updatedAllPages = [];
    const originalPageIndex = currentPageIndex; // Store original page index

    for (let i = 0; i < pages.length; i++) {
      // Temporarily switch to the page to render
      setCurrentPageIndex(i);
      setSelectedCapture(null);
      // Await a small delay to ensure React has re-rendered the correct page
      await new Promise(resolve => setTimeout(resolve, 50));

      const renderedImage = await captureCanvasContent();
      updatedAllPages.push({
        ...pages[i],
        renderedImage: renderedImage,
      });
    }

    // Restore original page index after processing all pages
    setCurrentPageIndex(originalPageIndex);
    setSelectedCapture(null); // Deselect after saving

    onSave(updatedAllPages); // Save the array of all updated pages
    showNotification('success', 'All pages saved successfully!');
    onClose(); // Close after saving all
  };

  const handleLayerChange = (e, captureId, direction) => {
        e.stopPropagation();
    setPages(prev => prev.map((page, index) => {
      if (index === currentPageIndex) {
        const currentCaptures = [...page.captures];
        const captureIndex = currentCaptures.findIndex(c => c.id === captureId);
        if (captureIndex === -1) return page;

        const [captureToMove] = currentCaptures.splice(captureIndex, 1);
        if (direction === 'front') {
          currentCaptures.push(captureToMove);
        } else if (direction === 'back') {
          currentCaptures.unshift(captureToMove);
        } else if (direction === 'forward') {
          if (captureIndex < currentCaptures.length) {
            currentCaptures.splice(captureIndex + 1, 0, captureToMove);
            } else {
            currentCaptures.push(captureToMove);
            }
        } else if (direction === 'backward') {
          if (captureIndex > 0) {
            currentCaptures.splice(captureIndex - 1, 0, captureToMove);
          } else {
            currentCaptures.unshift(captureToMove);
          }
        }

        return { ...page, captures: currentCaptures };
      }
      return page;
    }));
  };

  // NEW: Function to handle deleting a capture from the current page locally
  const handleDeleteCaptureLocal = (e, captureId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this capture from the page?')) {
      setPages(prev => prev.map((page, index) => {
        if (index === currentPageIndex) {
          return {
            ...page,
            captures: page.captures.filter(c => c.id !== captureId)
          };
        }
        return page;
      }));
      setSelectedCapture(null); // Deselect after deletion
      showNotification('Capture removed from page!', 'success');
    }
  };

  return (
    <div className="page-editor-modal">
      <div className="page-editor">
        <div className="page-editor-header">
          <div className="page-editor-title">
            <span>{space.name}</span>
            <div className="page-navigation">
              <button 
                className="nav-btn" 
                onClick={previousPage} 
                disabled={currentPageIndex === 0}
              >
                ◀
              </button>
              <small>Page {currentPageIndex + 1}/{pages.length}</small>
              <button
                className="nav-btn"
                onClick={nextPage}
                disabled={currentPageIndex === pages.length - 1}
              >
                ▶
              </button>
            </div>
          </div>
          <div className="page-editor-actions">
            <button className="page-editor-btn cancel" onClick={onClose}>Exit</button>
            <button className="page-editor-btn apply" onClick={handleApplyCurrentPage}>Apply</button>
            <button className="page-editor-btn save" onClick={handleSave}>Save All Changes</button>
          </div>
        </div>
        
        <div className="page-editor-content" ref={containerRef} onClick={handleContainerClick}>
          <div className="page-editor-canvas" ref={canvasRef}>
            {pages[currentPageIndex]?.captures.map(capture => (
              <div
                key={capture.id}
                className={`capture-container ${selectedCapture === capture.id ? 'selected' : ''}`}
                style={{
                  transform: `translate(${(capture.position.x) * (canvasDimensions?.scale || 1)}px, ${(capture.position.y) * (canvasDimensions?.scale || 1)}px)`,
                }}
                onMouseDown={(e) => handleMouseDown(e, capture.id)}
                onClick={(e) => handleCaptureClick(e, capture.id)}
              >
                <div
                  className="capture-wrapper"
                  style={{
                    transform: `scale(${capture.scale.x}, ${capture.scale.y}) rotate(${capture.rotation}deg)`,
                  }}
                >
                  <img
                    src={capture.imageData}
                    alt="Captured content"
                    className="capture-image"
                    draggable={false}
                  />
                  
                  {selectedCapture === capture.id && (
                    <>
                      <div className="resize-handle nw" onMouseDown={(e) => handleResizeStart(e, capture.id, 'nw')} />
                      <div className="resize-handle ne" onMouseDown={(e) => handleResizeStart(e, capture.id, 'ne')} />
                      <div className="resize-handle sw" onMouseDown={(e) => handleResizeStart(e, capture.id, 'sw')} />
                      <div className="resize-handle se" onMouseDown={(e) => handleResizeStart(e, capture.id, 'se')} />
                      <div className="rotate-handle" onMouseDown={(e) => handleRotateStart(e, capture.id)}>⟲</div>
                      {/* Layering Handles */}
                      <button className="layer-handle bring-front" onClick={(e) => handleLayerChange(e, capture.id, 'front')} title="Bring to Front">⬆</button>
                      <button className="layer-handle send-back" onClick={(e) => handleLayerChange(e, capture.id, 'back')} title="Send to Back">⬇</button>
                      <button className="layer-handle bring-forward" onClick={(e) => handleLayerChange(e, capture.id, 'forward')} title="Bring Forward">⇧</button>
                      <button className="layer-handle send-backward" onClick={(e) => handleLayerChange(e, capture.id, 'backward')} title="Send Backward">⇩</button>
                      {/* NEW: Delete Button in Editor */}
                      <button
                        className="delete-handle"
                        onClick={(e) => handleDeleteCaptureLocal(e, capture.id)}
                        title="Delete Capture from Page"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="page-editor-toolbar">
          <button className="toolbar-btn" title="Center Selection">⌖</button>
          <button className="toolbar-btn" title="Reset Rotation">↻</button>
          <button className="toolbar-btn" title="Reset Scale">1:1</button>
        </div>
      </div>
    </div>
  );
}

export default PageEditor;

