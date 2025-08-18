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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [rotationInput, setRotationInput] = useState(0); // This line was missing!
  const [zoomLevel, setZoomLevel] = useState(1); // NEW: State for zoom level
  const [setZoomOrigin] = useState({ x: 0, y: 0 }); // NEW: State for zoom origin
  const [pan, setPan] = useState({ x: 0, y: 0 }); // NEW: State for pan offset

  // Handle capture selection
  const handleCaptureClick = (e, captureId) => {
    e.stopPropagation();
    setSelectedCapture(captureId);
  };
  const handleWheel = (e) => {
    e.preventDefault(); // Prevent page scrolling

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();

    // Get mouse position relative to the canvas's visual boundaries
    const mouseX_onCanvas = e.clientX - canvasRect.left;
    const mouseY_onCanvas = e.clientY - canvasRect.top;

    // Calculate mouse position relative to the *unzoomed, unpanned* A4 content
    const mouseX_A4 = (mouseX_onCanvas - pan.x) / zoomLevel / (canvasDimensions.scale || 1);
    const mouseY_A4 = (mouseY_onCanvas - pan.y) / zoomLevel / (canvasDimensions.scale || 1);

    const zoomAmount = 0.1;
    let newZoomLevel = zoomLevel;

    if (e.deltaY < 0) {
      newZoomLevel = zoomLevel + zoomAmount;
    } else {
      newZoomLevel = zoomLevel - zoomAmount;
    }

    newZoomLevel = Math.max(0.5, Math.min(newZoomLevel, 3.0));

    // Calculate new pan to keep the mouseX_A4, mouseY_A4 fixed
    const newPanX = mouseX_onCanvas - (mouseX_A4 * newZoomLevel * (canvasDimensions.scale || 1));
    const newPanY = mouseY_onCanvas - (mouseY_A4 * newZoomLevel * (canvasDimensions.scale || 1));
    
    setPan({ x: newPanX, y: newPanY });
    setZoomLevel(newZoomLevel);
    // No need for zoomOrigin with this pan/zoom approach
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current; // Use ref directly
      if (canvas) {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const padding = 200;
        const baseWidthA4 = A4_WIDTH_MM * MM_TO_PX;
        const baseHeightA4 = A4_HEIGHT_MM * MM_TO_PX;
        
        const scaleW = (vw - padding) / baseWidthA4;
        const scaleH = (vh - padding) / baseHeightA4;
        const baseScale = Math.min(scaleW, scaleH, 0.8); // Base scale to fit A4 page
        
        // Set canvas dimensions based on baseScale (A4-space px for captures)
        const currentCanvasWidth = baseWidthA4 * baseScale;
        const currentCanvasHeight = baseHeightA4 * baseScale;

        // Store the base scale for capture position calculations
        setCanvasDimensions({ 
          width: currentCanvasWidth, 
          height: currentCanvasHeight, 
          scale: baseScale 
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    // We no longer depend on zoomLevel here as it's applied via transform directly
    return () => window.removeEventListener('resize', handleResize);
  }, [A4_WIDTH_MM, A4_HEIGHT_MM, MM_TO_PX]);

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
      aspectRatio: rect.width / rect.height
    });
    
    setInitialTransform({
      scale: { ...capture.scale },
      position: { ...capture.position }
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging && !isResizing) return;

      if (isDragging) {
        // NEW: Use combined scale for accurate drag calculation
        const combinedScale = (canvasDimensions?.scale || 1) * zoomLevel;
        const deltaX = (e.clientX - dragStart.x) / combinedScale;
        const deltaY = (e.clientY - dragStart.y) / combinedScale;

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
                  let newPosition = { ...initialTransform.position };
                  const { handle } = dragStart;

                  // NEW: Use combined scale for accurate resize calculation
                  const combinedScale = (canvasDimensions?.scale || 1) * zoomLevel;
                  const scaledDeltaX = deltaX / combinedScale; // Use combinedScale here
                  const scaledDeltaY = deltaY / combinedScale; // Use combinedScale here

                  // Calculate current capture dimensions in A4-space before the new scale is applied
                  const currentCaptureWidthA4 = capture.originalSize.width * initialTransform.scale.x;
                  const currentCaptureHeightA4 = capture.originalSize.height * initialTransform.scale.y;

                  switch(handle) {
                    case 'se':
                      newScale.x = initialTransform.scale.x * (1 + scaledDeltaX / currentCaptureWidthA4);
                      newScale.y = initialTransform.scale.y * (1 + scaledDeltaY / currentCaptureHeightA4);
                      break;
                    case 'sw':
                      newScale.x = initialTransform.scale.x * (1 - scaledDeltaX / currentCaptureWidthA4);
                      newScale.y = initialTransform.scale.y * (1 + scaledDeltaY / currentCaptureHeightA4);
                      newPosition.x = initialTransform.position.x + scaledDeltaX;
                      break;
                    case 'ne':
                      newScale.x = initialTransform.scale.x * (1 + scaledDeltaX / currentCaptureWidthA4);
                      newScale.y = initialTransform.scale.y * (1 - scaledDeltaY / currentCaptureHeightA4);
                      newPosition.y = initialTransform.position.y + scaledDeltaY;
                      break;
                    case 'nw':
                      newScale.x = initialTransform.scale.x * (1 - scaledDeltaX / currentCaptureWidthA4);
                      newScale.y = initialTransform.scale.y * (1 - scaledDeltaY / currentCaptureHeightA4);
                      newPosition.x = initialTransform.position.x + scaledDeltaX;
                      newPosition.y = initialTransform.position.y + scaledDeltaY;
                      break;
                    default:
                      break;
                  }

                  // Ensure minimum scale
                  newScale.x = Math.max(0.05, newScale.x); // Adjusted min scale slightly
                  newScale.y = Math.max(0.05, newScale.y); // Adjusted min scale slightly

                  return {
                    ...capture,
                    scale: newScale,
                    position: newPosition
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

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, canvasDimensions, currentPageIndex, dragStart, initialTransform, selectedCapture, zoomLevel]);

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

  const handleCenterSelection = (e) => {
    e.stopPropagation();
    if (!selectedCapture || !canvasRef.current) return;

    setPages(prev => prev.map((page, index) => {
      if (index === currentPageIndex) {
        return {
          ...page,
          captures: page.captures.map(capture => {
            if (capture.id === selectedCapture) {
              const canvasRect = canvasRef.current.getBoundingClientRect();
              const captureOriginalWidth = capture.originalSize.width * capture.scale.x;
              const captureOriginalHeight = capture.originalSize.height * capture.scale.y;

              const newX = (canvasRect.width / (canvasDimensions?.scale || 1) / 2) - (captureOriginalWidth / 2);
              const newY = (canvasRect.height / (canvasDimensions?.scale || 1) / 2) - (captureOriginalHeight / 2);

              return {
                ...capture,
                position: { x: newX, y: newY }
              };
            }
            return capture;
          })
        };
      }
      return page;
    }));
    showNotification('Capture centered!', 'info');
  };

  const handleResetRotation = (e) => {
    e.stopPropagation();
    if (!selectedCapture) return;

    setPages(prev => prev.map((page, index) => {
      if (index === currentPageIndex) {
        return {
          ...page,
          captures: page.captures.map(capture => {
            if (capture.id === selectedCapture) {
              return {
                ...capture,
                rotation: 0
              };
            }
            return capture;
          })
        };
      }
      return page;
    }));
    setRotationInput(0); // Also reset the input field
    showNotification('Rotation reset!', 'info');
  };

  const handleRotationInputChange = (e) => {
    const value = e.target.value;
    setRotationInput(value); // Update the input state immediately

    if (!selectedCapture) return;

    // Convert to number, default to 0 if invalid
    const newRotation = parseFloat(value) || 0;

    setPages(prev => prev.map((page, index) => {
      if (index === currentPageIndex) {
        return {
          ...page,
          captures: page.captures.map(capture => {
            if (capture.id === selectedCapture) {
              return {
                ...capture,
                rotation: newRotation
              };
            }
            return capture;
          })
        };
      }
      return page;
    }));
  };

  const handleRotate90 = (direction) => {
    if (!selectedCapture) return;

    setPages(prev => prev.map((page, index) => {
      if (index === currentPageIndex) {
        return {
          ...page,
          captures: page.captures.map(capture => {
            if (capture.id === selectedCapture) {
              let newRotation = capture.rotation || 0;
              if (direction === 'left') {
                newRotation = (newRotation - 90) % 360;
              } else if (direction === 'right') {
                newRotation = (newRotation + 90) % 360;
              }
              setRotationInput(Math.round(newRotation)); // Update input field
              return {
                ...capture,
                rotation: newRotation
              };
            }
            return capture;
          })
        };
      }
      return page;
    }));
    showNotification(`Rotated 90 degrees ${direction}!`, 'info');
  };

  useEffect(() => {
    if (selectedCapture) {
      const capture = pages[currentPageIndex].captures.find(c => c.id === selectedCapture);
      if (capture) {
        setRotationInput(Math.round(capture.rotation || 0));
      }
    } else {
      setRotationInput(0); // Reset input when nothing is selected
    }
  }, [selectedCapture, currentPageIndex, pages]); // Depend on selectedCapture and pages



  const handleResetScale = (e) => {
    e.stopPropagation();
    if (!selectedCapture) return;

    setPages(prev => prev.map((page, index) => {
      if (index === currentPageIndex) {
        return {
          ...page,
          captures: page.captures.map(capture => {
            if (capture.id === selectedCapture) {
              return {
                ...capture,
                scale: { x: 1, y: 1 }
              };
            }
            return capture;
          })
        };
      }
      return page;
    }));
    showNotification('Scale reset to 1:1!', 'info');
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
        
        <div className="page-editor-content" ref={containerRef} onClick={handleContainerClick} onWheel={handleWheel}> 
          <div 
            className="page-editor-canvas" 
            ref={canvasRef}
            style={{
              width: `${canvasDimensions.width}px`,
              height: `${canvasDimensions.height}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
              transformOrigin: '0 0' // Reset to 0 0 as we are handling origin via translation
            }}
          >
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
                      {/* Removed: Rotate Handle */}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="page-editor-toolbar">
          <button className="toolbar-btn" title="Zoom Out" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}>🔍-</button>
          <button className="toolbar-btn" title="Reset Zoom" onClick={() => { setZoomLevel(1); setZoomOrigin({ x: 0, y: 0 }); }}>100%</button> {/* NEW: Reset zoomOrigin here */}
          <button className="toolbar-btn" title="Zoom In" onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.1))}>🔍+</button>

          <button className="toolbar-btn" title="Center Selection" onClick={handleCenterSelection} disabled={!selectedCapture}>⌖</button>
          <button className="toolbar-btn" title="Reset Rotation" onClick={handleResetRotation} disabled={!selectedCapture}>↻</button>
          <button className="toolbar-btn" title="Reset Scale" onClick={handleResetScale} disabled={!selectedCapture}>1:1</button>
          
          {/* New Rotation Input and 90-degree buttons */}
          <button className="toolbar-btn" title="Rotate Left 90°" onClick={() => handleRotate90('left')} disabled={!selectedCapture}>⟲ 90°</button>
          <input
            type="number"
            className="toolbar-input"
            value={rotationInput}
            onChange={handleRotationInputChange}
            disabled={!selectedCapture}
            placeholder="Rotation"
            title="Set Rotation Degree"
            min="-360"
            max="360"
          />
          <button className="toolbar-btn" title="Rotate Right 90°" onClick={() => handleRotate90('right')} disabled={!selectedCapture}>90° ⟳</button>

          <button 
            className="toolbar-btn" 
            title="Bring to Front" 
            onClick={(e) => handleLayerChange(e, selectedCapture, 'front')} 
            disabled={!selectedCapture}
          >⬆</button>
          <button 
            className="toolbar-btn" 
            title="Send to Back" 
            onClick={(e) => handleLayerChange(e, selectedCapture, 'back')} 
            disabled={!selectedCapture}
          >⬇</button>
          <button 
            className="toolbar-btn" 
            title="Bring Forward" 
            onClick={(e) => handleLayerChange(e, selectedCapture, 'forward')} 
            disabled={!selectedCapture}
          >⇧</button>
          <button 
            className="toolbar-btn" 
            title="Send Backward" 
            onClick={(e) => handleLayerChange(e, selectedCapture, 'backward')} 
            disabled={!selectedCapture}
          >⇩</button>
          <button
            className="toolbar-btn delete-capture"
            onClick={(e) => handleDeleteCaptureLocal(e, selectedCapture)}
            title="Delete Capture from Page"
            disabled={!selectedCapture}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default PageEditor;
