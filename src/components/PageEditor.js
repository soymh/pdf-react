import React, { useState, useRef, useEffect } from 'react';
import './PageEditor.css';

function PageEditor({ space, onClose, onSave }) {
  // A4 dimensions and scaling constants
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MM_TO_PX = 96/25.4 // 1mm = 72/25.4 pixels (72 DPI is standard for PDF)
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pages, setPages] = useState(space.pages.map(page => ({
    ...page,
    captures: page.captures.map(capture => {
      // Calculate A4 center point
      const A4CenterX = (A4_WIDTH_MM * MM_TO_PX) / 2;
      const A4CenterY = (A4_HEIGHT_MM * MM_TO_PX) / 2;

      // Get the original size in pixels
      const originalSizeInPixels = capture.originalSize || { width: 200, height: 200 };
      
      // Calculate a default centered position if none exists
      const defaultPosition = {
        x: A4CenterX - (originalSizeInPixels.width / 2),
        y: A4CenterY - (originalSizeInPixels.height / 2)
      };

      // Use existing position or default
      const position = capture.position ? {
        x: capture.position.x,
        y: capture.position.y
      } : defaultPosition;

      // Calculate initial scale based on A4 size if not provided
      const defaultScale = capture.scale || {
        x: 1,
        y: 1
      };

      return {
        ...capture,
        position: position,
        scale: defaultScale,
        rotation: capture.rotation || 0,
        originalSize: originalSizeInPixels
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

  // Handle mouse movement for drag/resize/rotate
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
        const padding = 200; // Increased padding for better zoom-out
        
        // Calculate A4 size in pixels
        let width = A4_WIDTH_MM * MM_TO_PX;
        let height = A4_HEIGHT_MM * MM_TO_PX;
        
        // Scale to fit screen while maintaining aspect ratio (more zoomed out)
        const scaleW = (vw - padding) / width;
        const scaleH = (vh - padding) / height;
        const scale = Math.min(scaleW, scaleH, 0.8); // Reduced max scale for zoom-out
        
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
    // Convert editor coordinates to A4-relative coordinates for App.js compatibility
  const A4_WIDTH_PX = A4_WIDTH_MM * MM_TO_PX;
  const scaleFactor = (canvasDimensions?.width ?? A4_WIDTH_PX) / A4_WIDTH_PX;

      const scaledPages = pages.map(page => ({
        ...page,
        captures: page.captures.map(capture => ({
          ...capture,
          // position is currently in screen-px (after canvas zoom).
          // keep it, but also persist the canvas zoom so export can unscale it.
          editorScale: scaleFactor,

          position: {
            x: capture.position.x,
            y: capture.position.y,
          },
          dimensions: {
            width: capture.originalSize.width * capture.scale.x,
            height: capture.originalSize.height * capture.scale.y,
          },
          scale: capture.scale,
          rotation: capture.rotation,
          originalSize: capture.originalSize,
        }))
      }));
    onSave(scaledPages, currentPageIndex);
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
            <button className="page-editor-btn save-minimal" onClick={handleSave}>Save Changes</button>
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
