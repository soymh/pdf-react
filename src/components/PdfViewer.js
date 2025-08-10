import React, { useRef, useEffect, useState } from 'react';

function PdfViewer({ pdfData, onRemove, onPageChange, onCapture, index }) {
  const canvasRef = useRef(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfData.pdf) return;
      try {
        const page = await pdfData.pdf.getPage(pdfData.currentPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.2 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
      } catch (error) {
        console.error("Error rendering PDF page:", error);
      }
    };
    renderPage();
  }, [pdfData.pdf, pdfData.currentPage]);

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

    if (width > 10 && height > 10) {
      const canvas = canvasRef.current;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      
      tempCtx.drawImage(canvas, left, top, width, height, 0, 0, width, height);
      const imageData = tempCanvas.toDataURL('image/png');
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

  return (
    <div className="pdf-viewer glow"
		style={{ animationDelay: `${index * 100}ms`}}>
      <div className="pdf-header">
        <div className="pdf-title">{pdfData.name}</div>
        <div className="pdf-controls">
          <button className="pdf-nav-btn" onClick={() => changePage(-1)}>◀</button>
          <span>{pdfData.currentPage} / {pdfData.totalPages}</span>
          <button className="pdf-nav-btn" onClick={() => changePage(1)}>▶</button>
          <button className="pdf-nav-btn" onClick={() => onRemove(pdfData.id)} style={{ background: 'rgba(220, 38, 127, 0.3)' }}>✕</button>
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
