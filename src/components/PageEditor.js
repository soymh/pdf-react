import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';

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

    const capture = pages[currentPageIndex].captures.find(c => c.id === captureId);
    if (!capture) return;

    // Calculate actual rendered dimensions and position relative to the canvas
    const container = e.currentTarget; // This is the .capture-container
    const imgWrapper = container.querySelector('.capture-wrapper');
    const imgElement = container.querySelector('.capture-image');

    if (!imgWrapper || !imgElement) return;

    // const imgWrapperRect = imgWrapper.getBoundingClientRect();
    const imgElementRect = imgElement.getBoundingClientRect();

    // The 'transform: scale' is applied to imgWrapper, so imgElementRect gives us the visually scaled size
    const visualWidth = imgElementRect.width;
    const visualHeight = imgElementRect.height;

    // Get mouse position relative to the capture-wrapper's visual (scaled) top-left corner
    const mouseXInCapture = e.clientX - imgElementRect.left;
    const mouseYInCapture = e.clientY - imgElementRect.top;

    // Check if mouse click is within the *visually rendered* image area
    if (mouseXInCapture < 0 || mouseXInCapture > visualWidth ||
        mouseYInCapture < 0 || mouseYInCapture > visualHeight) {
      // If clicked outside the visual image, do not start drag
      return;
    }

    setIsDragging(true);
    setSelectedCapture(captureId);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
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
                  const combinedScale = (canvasDimensions?.scale || 1) * 2 * zoomLevel; // It WORKS! SO IS GOOD XD
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
      setPan({ x: 0, y: 0 }); // NEW: Reset pan when deselecting
      setZoomLevel(1);       // NEW: Reset zoom when deselecting
    }
  };

  // Save changes
  const nextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
      setSelectedCapture(null);
      setPan({ x: 0, y: 0 });   // NEW: Reset pan on page change
      setZoomLevel(1);       // NEW: Reset zoom on page change
    }
  };

  const previousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      setSelectedCapture(null);
      setPan({ x: 0, y: 0 });   // NEW: Reset pan on page change
      setZoomLevel(1);       // NEW: Reset zoom on page change
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

    const capture = pages[currentPageIndex].captures.find(c => c.id === selectedCapture);
    if (!capture) return;

    // Calculate the new position to center the capture within the A4 page (A4-space coordinates)
    // const newX = 0; // Manually set to 0 for debugging
    // const newY = 0; // Manually set to 0 for debugging

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
    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[999999] bg-[rgba(13,14,22,0.98)] flex justify-center items-center backdrop-blur-lg animate-editorFadeIn">
      <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#10111b]/95 to-[#161824]/95 shadow-[0_0_50px_rgba(147,51,234,0.2)] border border-cyber-purple/20">
        <div className="flex justify-between items-center p-[20px_30px] bg-gradient-to-r from-[#161824]/98 to-[#202230]/98 border-b-2 border-cyber-purple shadow-[0_2px_10px_rgba(0,0,0,0.3)] rounded-tl-xl rounded-tr-xl mb-[20px] h-[50px]">
          <div className="flex items-center gap-[15px] text-white text-sm font-bold">
            <span>{space.name}</span>
            <div className="flex items-center gap-[10px] ml-[15px] p-[4px_12px] bg-gradient-to-r from-cyber-purple/10 to-cyber-purple/5 border border-cyber-purple/20 rounded-[15px] shadow-[0_0_0_1px_rgba(147,51,234,0.1),0_4px_10px_rgba(0,0,0,0.2)] backdrop-blur-lg text-xs">
              <button 
                className="w-[30px] h-[30px] rounded-[15px] cursor-pointer flex items-center justify-center bg-cyber-purple/20 border-none text-white text-sm transition-all duration-200 hover:bg-cyber-purple/40"
                onClick={previousPage} 
                disabled={currentPageIndex === 0}
              >
                ◀
              </button>
              <small>Page {currentPageIndex + 1}/{pages.length}</small>
              <button
                className="w-[30px] h-[30px] rounded-[15px] cursor-pointer flex items-center justify-center bg-cyber-purple/20 border-none text-white text-sm transition-all duration-200 hover:bg-cyber-purple/40"
                onClick={nextPage}
                disabled={currentPageIndex === pages.length - 1}
              >
                ▶
              </button>
            </div>
          </div>
          <div className="flex gap-[10px]">
            <button className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] text-cyber-light py-[8px_16px] rounded-[8px] cursor-pointer text-xs font-semibold uppercase tracking-[0.5px] transition-all duration-300 relative overflow-hidden hover:bg-[rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(0,0,0,0.2)]" onClick={onClose}>Exit</button>
            <button className="bg-[rgba(147,51,234,0.15)] border border-[rgba(147,51,234,0.4)] text-cyber-light py-[8px_16px] rounded-[8px] cursor-pointer text-xs font-semibold uppercase tracking-[0.5px] transition-all duration-300 relative overflow-hidden hover:bg-[rgba(147,51,234,0.25)] hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(147,51,234,0.2)]" onClick={handleApplyCurrentPage}>Apply</button>
            <button className="bg-[linear-gradient(45deg,rgba(147,51,234,0.9),rgba(167,71,254,0.9))] border border-[rgba(147,51,234,0.5)] text-cyber-light py-[8px_16px] rounded-[8px] cursor-pointer text-xs font-semibold uppercase tracking-[0.5px] transition-all duration-300 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(147,51,234,0.4),0_0_0_1px_rgba(147,51,234,0.5)]" onClick={handleSave}>Save All Changes</button>
          </div>
        </div>
        
        <div className="flex-1 relative overflow-hidden flex justify-center items-center bg-gradient-to-br from-[#0d0e16]/95 to-[#141621]/95 p-[40px_20px] pt-[90px] min-h-screen perspective-1000" ref={containerRef} onClick={handleContainerClick} onWheel={handleWheel}> 
          <div 
            className="relative bg-white max-h-[calc(100vh-200px)] w-auto shadow-[0_0_0_1px_rgba(147,51,234,0.15),0_0_20px_rgba(147,51,234,0.08),0_0_40px_rgba(0,0,0,0.2)] transition-all duration-300 translateZ-0 rounded-sm animation-none"
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
                  className={`absolute cursor-move select-none filter drop-shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-filter duration-200 ${selectedCapture === capture.id ? 'selected' : ''}`}
                  style={{
                  // Position relative to the A4 canvas.
                  // These are A4-space coordinates, so they are multiplied by canvasDimensions.scale
                  // for display on the screen, and then further by zoomLevel.
                  // The captures themselves will have their width/height set directly,
                  // so the position needs to be for the *top-left corner* of the scaled image.
                  transform: `translate(${(capture.position.x) * (canvasDimensions?.scale || 1)}px, ${(capture.position.y) * (canvasDimensions?.scale || 1)}px)`
                  }}
                  onMouseDown={(e) => handleMouseDown(e, capture.id)}
                  onClick={(e) => handleCaptureClick(e, capture.id)}
                >
                  <div
                    className="relative transform-origin-center"
                    style={{
                      // Set explicit width and height based on original size and current scale
                      width: `${capture.originalSize.width * capture.scale.x}px`,
                      height: `${capture.originalSize.height * capture.scale.y}px`,
                      transform: `rotate(${capture.rotation}deg)`, // Keep rotation here
                      transformOrigin: 'center center' // Ensure rotation is around the center
                    }}
                  >
                    <img
                      src={capture.imageData}
                      alt="Captured content"
                      className="w-full h-full border-2 border-transparent transition-all duration-200"
                      draggable={false}
                      style={{
                        width: '100%', // Make image fill its parent wrapper
                        height: '100%',
                        // Removed objectFit: 'contain' to allow free aspect ratio changes
                      }}
                    />
                    
                    {selectedCapture === capture.id && (
                      <>
                        <div className="absolute w-4 h-4 bg-cyber-purple/90 border-2 border-white rounded-full transition-all duration-200 opacity-100 block z-[1000] shadow-[0_0_10px_rgba(0,0,0,0.3)] top-[-8px] left-[-8px] cursor-nw-resize hover:scale-125 hover:bg-cyber-purple hover:shadow-[0_0_15px_rgba(147,51,234,0.5)]" onMouseDown={(e) => handleResizeStart(e, capture.id, 'nw')} />
                        <div className="absolute w-4 h-4 bg-cyber-purple/90 border-2 border-white rounded-full transition-all duration-200 opacity-100 block z-[1000] shadow-[0_0_10px_rgba(0,0,0,0.3)] top-[-8px] right-[-8px] cursor-ne-resize hover:scale-125 hover:bg-cyber-purple hover:shadow-[0_0_15px_rgba(147,51,234,0.5)]" onMouseDown={(e) => handleResizeStart(e, capture.id, 'ne')} />
                        <div className="absolute w-4 h-4 bg-cyber-purple/90 border-2 border-white rounded-full transition-all duration-200 opacity-100 block z-[1000] shadow-[0_0_10px_rgba(0,0,0,0.3)] bottom-[-8px] left-[-8px] cursor-sw-resize hover:scale-125 hover:bg-cyber-purple hover:shadow-[0_0_15px_rgba(147,51,234,0.5)]" onMouseDown={(e) => handleResizeStart(e, capture.id, 'sw')} />
                        <div className="absolute w-4 h-4 bg-cyber-purple/90 border-2 border-white rounded-full transition-all duration-200 opacity-100 block z-[1000] shadow-[0_0_10px_rgba(0,0,0,0.3)] bottom-[-8px] right-[-8px] cursor-se-resize hover:scale-125 hover:bg-cyber-purple hover:shadow-[0_0_15px_rgba(147,51,234,0.5)]" onMouseDown={(e) => handleResizeStart(e, capture.id, 'se')} />
                      </>
                    )}
                  </div>
                </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-[30px] left-1/2 -translate-x-1/2 flex gap-3 bg-[rgba(22,24,36,0.90)] p-[12px_20px] rounded-xl z-[1000] border border-cyber-purple/20 shadow-[0_4px_12px_rgba(0,0,0,0.25),0_0_20px_rgba(147,51,234,0.1)] backdrop-blur-lg animation-none">
          <button className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" title="Zoom Out" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}>🔍-</button>
          <button className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" title="Reset Zoom" onClick={() => { setZoomLevel(1);setPan({ x: 0, y: 0 });}}>100%</button> {/* NEW: Reset zoomOrigin here */}
          <button className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" title="Zoom In" onClick={() => setZoomLevel(prev => Math.min(4.0, prev + 0.1))}>🔍+</button>

          <button className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" title="Center Selection" onClick={handleCenterSelection} disabled={!selectedCapture}>⌖</button>
          <button className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" title="Reset Rotation" onClick={handleResetRotation} disabled={!selectedCapture}>↻</button>
          <button className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" title="Reset Scale" onClick={handleResetScale} disabled={!selectedCapture}>1:1</button>
          
          {/* New Rotation Input and 90-degree buttons */}
          <button className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" title="Rotate Left 90°" onClick={() => handleRotate90('left')} disabled={!selectedCapture}>⟲ 90°</button>
          <input
            type="number"
            className="w-[60px] h-10 rounded-lg p-0 px-2 text-base text-center transition-all duration-200 bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light outline-none focus:shadow-[0_0_0_2px_rgba(147,51,234,0.2)]"
            value={rotationInput}
            onChange={handleRotationInputChange}
            disabled={!selectedCapture}
            placeholder="Rotation"
            title="Set Rotation Degree"
            min="-360"
            max="360"
          />
          <button className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" title="Rotate Right 90°" onClick={() => handleRotate90('right')} disabled={!selectedCapture}>90° ⟳</button>

          <button 
            className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" 
            title="Bring to Front" 
            onClick={(e) => handleLayerChange(e, selectedCapture, 'front')} 
            disabled={!selectedCapture}
          >⬆</button>
          <button 
            className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" 
            title="Send to Back" 
            onClick={(e) => handleLayerChange(e, selectedCapture, 'back')} 
            disabled={!selectedCapture}
          >⬇</button>
          <button 
            className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" 
            title="Bring Forward" 
            onClick={(e) => handleLayerChange(e, selectedCapture, 'forward')} 
            disabled={!selectedCapture}
          >⇧</button>
          <button 
            className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-cyber-purple/8 border border-cyber-purple/15 text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-cyber-purple/15 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(147,51,234,0.15)]" 
            title="Send Backward" 
            onClick={(e) => handleLayerChange(e, selectedCapture, 'backward')} 
            disabled={!selectedCapture}
          >⇩</button>
          <button
            className="w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center bg-[rgba(220,38,127,0.9)] border-2 border-white text-cyber-light text-lg transition-all duration-200 relative overflow-hidden hover:bg-[rgba(239,68,68,1)] hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(220,38,127,0.5)]"
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