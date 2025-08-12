import React, { useState, useRef, useEffect } from 'react';
import './PageEditor.css';

function PageEditor({ space, onClose, onSave }) {
  // A4 dimensions and scaling constants
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MM_TO_PX = 3.78; // 1mm = 3.78px at 96 DPI
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pages, setPages] = useState(space.pages.map(page => ({
    ...page,
    captures: page.captures.map(capture => {
      // Initialize capture with centered position if none exists
      const defaultPosition = {
        x: (A4_WIDTH_MM * MM_TO_PX) / 2 - 100,
        y: (A4_HEIGHT_MM * MM_TO_PX) / 2 - 100
      };

      return {
        ...capture,
        position: capture.position || defaultPosition,
        scale: capture.scale || { x: 1, y: 1 },
        rotation: capture.rotation || 0,
        originalSize: capture.originalSize || { width: 200, height: 200 } // Store original size
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
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      handle
    });
    
    const capture = pages[currentPageIndex].captures.find(c => c.id === captureId);
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

  // Handle mouse movement for drag/resize/rotate
  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing && !isRotating) return;

    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPages(prev => prev.map((page, index) => {
        if (index === currentPageIndex) {
          return {
            ...page,
            captures: page.captures.map(capture => {
              if (capture.id === selectedCapture) {
                return {
                  ...capture,
                  position: {
                    x: initialTransform.position.x + deltaX,
                    y: initialTransform.position.y + deltaY
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
    
    if (isResizing) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const scaleMultiplier = 0.005;
      
      setPages(prev => prev.map((page, index) => {
        if (index === currentPageIndex) {
          return {
            ...page,
            captures: page.captures.map(capture => {
              if (capture.id === selectedCapture) {
                const newScale = {
                  x: initialTransform.scale.x + deltaX * scaleMultiplier,
                  y: initialTransform.scale.y + deltaY * scaleMultiplier
                };
                
                // Ensure minimum scale
                newScale.x = Math.max(0.1, newScale.x);
                newScale.y = Math.max(0.1, newScale.y);
                
                return {
                  ...capture,
                  scale: newScale
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

  // Handle mouse up for all interactions
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
  };

  // Add/remove global mouse event listeners
  useEffect(() => {
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
  }, [isDragging, isResizing, isRotating]);

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
        const padding = 160; // Header + toolbar + margins
        
        // Calculate A4 size in pixels
        let width = A4_WIDTH_MM * MM_TO_PX;
        let height = A4_HEIGHT_MM * MM_TO_PX;
        
        // Scale to fit screen while maintaining aspect ratio
        const scaleW = (vw - padding) / width;
        const scaleH = (vh - padding) / height;
        const scale = Math.min(scaleW, scaleH, 1); // Never scale up
        
        width *= scale;
        height *= scale;
        
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.dataset.scale = scale.toString();
        setCanvasDimensions({ width, height, scale });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial sizing
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSave = () => {
    // Convert positions and sizes back to A4 scale for saving
    const scaledPages = pages.map(page => ({
      ...page,
      captures: page.captures.map(capture => {
        const canvasScale = parseFloat(document.querySelector('.page-editor-canvas').dataset.scale);
        return {
          ...capture,
          position: {
            x: capture.position.x / canvasScale,
            y: capture.position.y / canvasScale
          },
          scale: {
            x: capture.scale.x,
            y: capture.scale.y
          },
          rotation: capture.rotation,
          originalSize: capture.originalSize
        };
      })
    }));
    onSave(scaledPages, currentPageIndex);
  };

  return (
    <div className="page-editor-modal">
      <div className="page-editor">
        <div className="page-editor-header">
          <div className="page-editor-title">
            <h2>Editing: {space.name}</h2>
            <div className="page-navigation">
              <button 
                className="nav-btn" 
                onClick={previousPage} 
                disabled={currentPageIndex === 0}
              >
                ◀
              </button>
              <span>Page {currentPageIndex + 1} of {pages.length}</span>
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
            <button className="page-editor-btn save" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
        
        <div className="page-editor-content" ref={containerRef} onClick={handleContainerClick}>
          <div className="page-editor-canvas" ref={canvasRef}>
            {pages[currentPageIndex]?.captures.map(capture => (
              <div
                key={capture.id}
                className={`capture-container ${selectedCapture === capture.id ? 'selected' : ''}`}
                style={{
                  transform: `translate(${capture.position.x}px, ${capture.position.y}px)`,
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
