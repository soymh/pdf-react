import React, { useRef, useEffect, useState } from 'react';

function PdfViewer({ pdfData, onRemove, onPageChange, onCapture, index }) {
  const canvasRef = useRef(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const [scale, setScale] = useState(1.5); // Increased default scale for better readability
  
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfData.pdf) return;
      try {
        const page = await pdfData.pdf.getPage(pdfData.currentPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        // Calculate optimal scale based on container width
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth - 40; // Account for padding
        const viewport = page.getViewport({ scale: 1 });
        const optimalScale = Math.min(scale, containerWidth / viewport.width);
        
        const scaledViewport = page.getViewport({ scale: optimalScale });
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        
        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render with higher quality
        await page.render({ 
          canvasContext: context, 
          viewport: scaledViewport,
          renderInteractiveForms: true
        }).promise;
      } catch (error) {
        console.error("Error rendering PDF page:", error);
      }
    };
    renderPage();
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
  
  const handleMouseUp = () => {
    if (!isSelecting || !selectionRect) return;

    const { startX, endX, startY, endY } = selectionRect;
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    if (width > 15 && height > 15) { // Minimum selection size
      const canvas = canvasRef.current;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      
      // Higher quality capture
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      tempCtx.drawImage(canvas, left, top, width, height, 0, 0, width, height);
      const imageData = tempCanvas.toDataURL('image/png', 1.0); // Maximum quality
      onCapture(imageData, pdfData);
    }
    
    setIsSelecting(false);
    setSelectionRect(null);
  };
  
  const getSelectionStyle = () => {
    if (!selectionRect) return { display: 'none' };
    const { startX, endX, startY, endY } = selectionRect;
    return {
      left: Math.min(startX, endX) + 'px',
      top: Math.min(startY, endY) + 'px',
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