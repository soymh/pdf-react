import React, { useRef, useEffect, useState } from 'react';

function PdfViewer({ pdfData, onRemove, onPageChange, onCapture, index }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const [scale, setScale] = useState(1.5); // Increased default scale for better readability
  
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfData.pdf) {
        console.log(`PdfViewer ${pdfData.id}: No PDF object, skipping render.`);
        return;
      }

      // Log detailed state just before attempting to render
      console.log(`PdfViewer ${pdfData.id}: Render attempt - Page: ${pdfData.currentPage}, Total: ${pdfData.totalPages}, Is Destroyed: ${pdfData.pdf.isDestroyed}`);

      if (pdfData.pdf.isDestroyed) {
        console.warn(`PdfViewer ${pdfData.id}: Attempted to render a destroyed PDF, skipping.`);
        return;
      }

      try {
        // Cancel any ongoing render operation
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // Ignore cancellation errors
          }
          renderTaskRef.current = null;
        }
        
        const page = await pdfData.pdf.getPage(pdfData.currentPage);
        
        // Create a completely new canvas for this render operation
        const newCanvas = document.createElement('canvas');
        const context = newCanvas.getContext('2d');
        
        // Calculate optimal scale based on container width
        const container = canvasRef.current?.parentElement;
        const containerWidth = container ? container.clientWidth - 40 : 400;
        const viewport = page.getViewport({ scale: 1 });
        const optimalScale = Math.min(scale, containerWidth / viewport.width);
        
        const scaledViewport = page.getViewport({ scale: optimalScale });
        newCanvas.height = scaledViewport.height;
        newCanvas.width = scaledViewport.width;
        
        // Store the render task and wait for it to complete
        renderTaskRef.current = page.render({ 
          canvasContext: context, 
          viewport: scaledViewport,
          renderInteractiveForms: true
        });
        
        await renderTaskRef.current.promise;
        
        // Only update the DOM canvas if this render wasn't cancelled
        if (renderTaskRef.current && canvasRef.current) {
          const oldCanvas = canvasRef.current;
          const oldContext = oldCanvas.getContext('2d');
          
          // Match dimensions
          oldCanvas.width = newCanvas.width;
          oldCanvas.height = newCanvas.height;
          
          // Clear and copy the rendered content
          oldContext.clearRect(0, 0, oldCanvas.width, oldCanvas.height);
          oldContext.drawImage(newCanvas, 0, 0);
        }
        
        renderTaskRef.current = null;
        
      } catch (error) {
        // Only log errors that are not due to rendering cancellation
        if (error.name !== 'RenderingCancelledException') {
          console.error("Error rendering PDF page:", error);
        }
        renderTaskRef.current = null;
      }
    };
    renderPage();
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdfData.pdf, pdfData.currentPage, scale]);

  const handleMouseDown = (e) => {
    setIsSelecting(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionRect({ startX: x, startY: y, endX: x, endY: y });
  };
  
  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionRect(prev => ({ ...prev, endX: x, endY: y }));
  };
  
  const handleMouseUp = async () => { // Make the function async
    if (!isSelecting || !selectionRect) return;

    const { startX, endX, startY, endY } = selectionRect;
    const canvas = canvasRef.current;
    
    // Normalize coordinates
    const rectX = Math.min(startX, endX);
    const rectY = Math.min(startY, endY);
    const rectWidth = Math.abs(endX - startX);
    const rectHeight = Math.abs(endY - startY);

    if (rectWidth > 15 && rectHeight > 15) { // Minimum selection size
      try {
        // --- High-Quality Capture Logic ---
        const page = await pdfData.pdf.getPage(pdfData.currentPage);
        const captureScale = 5.0; // Increase for higher quality - 5x resolution
        const viewport = page.getViewport({ scale: captureScale });

        // Create a temporary, high-res canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Render the page at high resolution
        await page.render({
          canvasContext: tempCtx,
          viewport: viewport,
        }).promise;
        
        // Calculate the source coordinates on the high-res canvas.
        // We need to scale the selection box coordinates from the display canvas size
        // to the high-res canvas size.
        const scaleX = tempCanvas.width / canvas.width;
        const scaleY = tempCanvas.height / canvas.height;

        const sourceX = rectX * scaleX;
        const sourceY = rectY * scaleY;
        const sourceWidth = rectWidth * scaleX;
        const sourceHeight = rectHeight * scaleY;

        // Create a final canvas to hold just the captured snippet
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = sourceWidth;
        captureCanvas.height = sourceHeight;
        const captureCtx = captureCanvas.getContext('2d');
        
        captureCtx.imageSmoothingEnabled = true;
        captureCtx.imageSmoothingQuality = 'high';

        // Copy the selected region from the high-res canvas to the snippet canvas
        captureCtx.drawImage(
          tempCanvas,
          sourceX, sourceY, sourceWidth, sourceHeight, // Source rect
          0, 0, sourceWidth, sourceHeight // Destination rect
        );

        // Get the final high-quality image data
        const imageData = captureCanvas.toDataURL('image/png', 1.0); // Use PNG for quality
        console.log('PdfViewer calling onCapture for PDF:', pdfData.name, pdfData.id);
        onCapture(imageData, pdfData);
      } catch (error) {
        console.error("Error during high-quality capture:", error);
      }
    }
    
    setIsSelecting(false);
    setSelectionRect(null);
  };
  
  const getSelectionStyle = () => {
    if (!selectionRect || !canvasRef.current) return { display: 'none' };
    const { startX, endX, startY, endY } = selectionRect;
    const canvas = canvasRef.current;
    return {
      // Add the canvas's offset within its container to correctly position the overlay
      left: Math.min(startX, endX) + canvas.offsetLeft + 'px',
      top: Math.min(startY, endY) + canvas.offsetTop + 'px',
      width: Math.abs(endX - startX) + 'px',
      height: Math.abs(endY - startY) + 'px',
    };
  };

  const changePage = (offset) => {
    const newPage = pdfData.currentPage + offset;
    if (newPage > 0 && newPage <= pdfData.totalPages) {
      onPageChange(pdfData.id, newPage);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3)); // Max scale 3x
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5)); // Min scale 0.5x
  };

  const handleResetZoom = () => {
    setScale(1.5);
  };

  return (
    <div className="pdf-viewer glow" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="pdf-header">
        <div className="pdf-title" title={pdfData.name}>{pdfData.name}</div>
        <div className="pdf-controls">
          <button className="pdf-nav-btn" onClick={handleZoomOut} title="Zoom Out">-</button>
          <button className="pdf-nav-btn" onClick={handleResetZoom} title="Reset Zoom">⚬</button>
          <button className="pdf-nav-btn" onClick={handleZoomIn} title="Zoom In">+</button>
          <button
            className="pdf-nav-btn"
            onClick={() => changePage(-1)}
            disabled={pdfData.currentPage <= 1}
            title="Previous Page"
          >
            ◀
          </button>
          <span style={{ padding: '0 10px', fontSize: '14px', fontWeight: 'bold' }}>
            {pdfData.currentPage} / {pdfData.totalPages}
          </span>
          <button
            className="pdf-nav-btn"
            onClick={() => changePage(1)}
            disabled={pdfData.currentPage >= pdfData.totalPages}
            title="Next Page"
          >
            ▶
          </button>
          <button
            className="pdf-nav-btn"
            onClick={() => onRemove(pdfData.id)}
            style={{ background: 'linear-gradient(45deg, rgba(220, 38, 127, 0.4), rgba(190, 24, 93, 0.6))' }}
            title="Remove PDF"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="pdf-canvas-container" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <canvas
          ref={canvasRef}
          className="pdf-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        />
        {isSelecting && <div className="selection-overlay" style={getSelectionStyle()}></div>}
      </div>
    </div>
  );
}

export default PdfViewer;