import React, { useRef, useEffect, useState, useCallback } from 'react';

function PdfViewer({ pdfData, onRemove, onPageChange, onCapture, index, isZenMode }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const renderPage = async () => {
    const canvas = canvasRef.current;
      if (!pdfData.pdf || !canvas) {
        console.log(`PdfViewer ${pdfData.id}: Missing PDF object or canvas, skipping render.`);
        return;
      }
    
      console.log(`PdfViewer ${pdfData.id}: Render attempt - Page: ${pdfData.currentPage}, Total: ${pdfData.totalPages}`);

      if (pdfData.pdf.isDestroyed) {
        console.warn(`PdfViewer ${pdfData.id}: Attempted to render a destroyed PDF, skipping.`);
        return;
      }

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // Ignore cancellation errors
          }
          renderTaskRef.current = null;
        }

        const page = await pdfData.pdf.getPage(pdfData.currentPage);
        const context = canvas.getContext('2d');

        const outputScale = window.devicePixelRatio || 1;

        const viewport = page.getViewport({ scale: 1 });

        const container = canvas.parentElement;
        const desiredDisplayWidth = container ? (container.clientWidth - (parseFloat(getComputedStyle(container).paddingLeft) || 0) - (parseFloat(getComputedStyle(container).paddingRight) || 0)) : viewport.width;
        const desiredDisplayHeight = container ? (container.clientHeight - (parseFloat(getComputedStyle(container).paddingTop) || 0) - (parseFloat(getComputedStyle(container).paddingBottom) || 0)) : viewport.height;

        const baseScaleWidth = desiredDisplayWidth / viewport.width;
        const baseScaleHeight = desiredDisplayHeight / viewport.height;
        const fitScale = Math.min(baseScaleWidth, baseScaleHeight);

        const finalDisplayScale = fitScale * scale;

        canvas.style.width = `${viewport.width * finalDisplayScale}px`;
        canvas.style.height = `${viewport.height * finalDisplayScale}px`;

        const actualCanvasWidth = Math.floor(viewport.width * finalDisplayScale * outputScale);
        const actualCanvasHeight = Math.floor(viewport.height * finalDisplayScale * outputScale);

        canvas.width = actualCanvasWidth;
        canvas.height = actualCanvasHeight;

        context.scale(outputScale, outputScale);

        const renderViewport = page.getViewport({ scale: finalDisplayScale });

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: renderViewport,
          renderInteractiveForms: true
        });
        
        await renderTaskRef.current.promise;

      } catch (error) {
        if (error.name !== 'RenderingCancelledException') {
          console.error("Error rendering PDF page:", error);
      }
      } finally {
        renderTaskRef.current = null;
    }
  };
  
    renderPage();

    const resizeObserver = new ResizeObserver(() => {
        renderPage();
    });

    const containerElement = canvasRef.current?.parentElement;
    if (containerElement) {
        resizeObserver.observe(containerElement);
    }

    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      }
      if (containerElement) {
          resizeObserver.unobserve(containerElement);
      }
      renderTaskRef.current = null;
    };
  }, [pdfData.pdf, pdfData.currentPage, pdfData.id, pdfData.totalPages, isZenMode, scale]);

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

  const handleMouseUp = async () => {
    if (!isSelecting || !selectionRect) return;

    const { startX, endX, startY, endY } = selectionRect;
    const canvas = canvasRef.current; // The displayed canvas element (its CSS size)

    // Calculate the selection rectangle in CSS pixels relative to the displayed canvas
    const rectX = Math.min(startX, endX);
    const rectY = Math.min(startY, endY);
    const rectWidth = Math.abs(endX - startX);
    const rectHeight = Math.abs(endY - startY);

    if (rectWidth > 15 && rectHeight > 15) { // Minimum size check for a valid selection
      try {
        const page = await pdfData.pdf.getPage(pdfData.currentPage);

        // Define a fixed high-resolution scale for the temporary capture canvas
        const captureScale = 5.0; 
        const viewportForCapture = page.getViewport({ scale: captureScale });

        // Create a temporary canvas for high-resolution rendering of the entire page
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewportForCapture.width;
        tempCanvas.height = viewportForCapture.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Render the entire PDF page to the temporary canvas at the high capture resolution
        await page.render({
          canvasContext: tempCtx,
          viewport: viewportForCapture,
          renderInteractiveForms: true
        }).promise;

        // --- CRITICAL CORRECTION ---
        // Calculate the scaling ratio from the CSS pixels of the displayed canvas
        // to the actual pixels of the high-resolution temporary capture canvas.
        // canvas.clientWidth and canvas.clientHeight give the rendered CSS dimensions.
        const scaleRatioX = tempCanvas.width / canvas.clientWidth;
        const scaleRatioY = tempCanvas.height / canvas.clientHeight;

        // Apply this precise ratio to the selection rectangle coordinates (which are in CSS pixels)
        // to get the source coordinates and dimensions on the high-resolution tempCanvas.
        const sourceX = rectX * scaleRatioX;
        const sourceY = rectY * scaleRatioY;
        const sourceWidth = rectWidth * scaleRatioX;
        const sourceHeight = rectHeight * scaleRatioY;

        // Create the final canvas for the cropped capture image
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = sourceWidth;
        captureCanvas.height = sourceHeight;
        const captureCtx = captureCanvas.getContext('2d');
        
        captureCtx.imageSmoothingEnabled = true;
        captureCtx.imageSmoothingQuality = 'high';

        // Draw the selected portion from the high-resolution temporary canvas
        // to the final capture canvas, effectively cropping it.
        captureCtx.drawImage(
          tempCanvas,
          sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle on tempCanvas
          0, 0, sourceWidth, sourceHeight             // Destination rectangle on captureCanvas
        );

        // Get the final high-quality image data (PNG for best quality)
        const imageData = captureCanvas.toDataURL('image/png', 1.0);
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
      left: Math.min(startX, endX) + canvas.offsetLeft + 'px',
      top: Math.min(startY, endY) + canvas.offsetTop + 'px',
      width: Math.abs(endX - startX) + 'px',
      height: Math.abs(endY - startY) + 'px',
    };
  };

  const changePage = useCallback((offset) => {
    const newPage = pdfData.currentPage + offset;
    if (newPage > 0 && newPage <= pdfData.totalPages) {
      onPageChange(pdfData.id, newPage);
    }
  }, [onPageChange, pdfData.id, pdfData.currentPage, pdfData.totalPages]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };
  const handleResetZoom = () => {
    setScale(1);
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