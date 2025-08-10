import React, { useState, useEffect, useCallback } from 'react';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import { jsPDF } from "jspdf";

import Header from './components/Header';
import PdfViewer from './components/PdfViewer';
import SpacesPanel from './components/SpacesPanel';
import CreateSpaceModal from './components/CreateSpaceModal';
import Notification from './components/Notification';
import './App.css';

// Set up the PDF.js worker
// GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${require('pdfjs-dist/package.json').version}/pdf.worker.min.js`;
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function App() {
  const [pdfDocuments, setPdfDocuments] = useState([]);
  const [spaces, setSpaces] = useState(() => {
    // Lazy initializer to get spaces from localStorage only on first render
    const savedSpaces = localStorage.getItem('pdfWorkspaceSpaces');
    return savedSpaces ? JSON.parse(savedSpaces) : [];
  });
  const [activeSpaceId, setActiveSpaceId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Effect to save spaces to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pdfWorkspaceSpaces', JSON.stringify(spaces));
  }, [spaces]);
  
  // Welcome notification on first load
  useEffect(() => {
    showNotification('🌟 Welcome to PDF Workspace - Cyberpunk Edition! 🌟', 'success');
  }, []);

  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    setPdfDocuments([]); // Clear previous PDFs

    if (files.length === 0) {
      showNotification('No files selected', 'warning');
      return;
    }

    showNotification(`Loading ${files.length} PDF(s)...`, 'info');

    const loadedPdfs = await Promise.all(
      files.map(async (file) => {
        if (file.type === 'application/pdf') {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await require('pdfjs-dist').getDocument(arrayBuffer).promise;
            return {
              id: Date.now() + Math.random(),
              name: file.name,
              pdf: pdf,
              currentPage: 1,
              totalPages: pdf.numPages,
            };
          } catch (error) {
            showNotification(`Error loading ${file.name}: ${error.message}`, 'error');
            return null;
          }
        }
        return null;
      })
    );

    setPdfDocuments(loadedPdfs.filter(Boolean));
  };

  const removePDF = (pdfId) => {
    setPdfDocuments(docs => docs.filter(doc => doc.id !== pdfId));
  };

  const updatePdfPage = (pdfId, newPage) => {
    setPdfDocuments(docs =>
      docs.map(doc =>
        doc.id === pdfId ? { ...doc, currentPage: newPage } : doc
      )
    );
  };
  
  const handleCapture = (imageData, sourcePdf) => {
    if (!activeSpaceId || !spaces.find(s => s.id === activeSpaceId)) {
      showNotification('Select a space first or create a new one', 'warning');
      return;
    }

    setSpaces(prevSpaces =>
      prevSpaces.map(space => {
        if (space.id === activeSpaceId) {
          const newCapture = {
            id: Date.now() + Math.random(),
            imageData: imageData,
            source: sourcePdf.name,
            page: sourcePdf.currentPage,
            timestamp: new Date().toISOString()
          };
          return { ...space, captures: [...(space.captures || []), newCapture] };
        }
        return space;
      })
    );
    showNotification('Capture added to space!', 'success');
  };
  
  const confirmCreateSpace = (name) => {
    const newSpace = {
      id: Date.now() + Math.random(),
      name: name,
      captures: [],
      created: new Date().toISOString()
    };
    setSpaces(prev => [...prev, newSpace]);
    setActiveSpaceId(newSpace.id);
    setIsModalOpen(false);
    showNotification(`Space "${name}" created!`, 'success');
  };

  const deleteSpace = (spaceId) => {
    if (window.confirm('Are you sure you want to delete this space? This action cannot be undone.')) {
      setSpaces(spaces => spaces.filter(s => s.id !== spaceId));
      if (activeSpaceId === spaceId) {
        setActiveSpaceId(null);
      }
      showNotification('Space deleted', 'success');
    }
  };
  
  const updateSpaceCaptures = (spaceId, newCaptures) => {
     setSpaces(prevSpaces => 
        prevSpaces.map(s => s.id === spaceId ? {...s, captures: newCaptures} : s)
     );
  };
  
  const exportSpaceAsPdf = async (spaceId) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space || !space.captures || space.captures.length === 0) {
      showNotification('No captures to export', 'warning');
      return;
    }
    
    showNotification('Generating PDF...', 'info');
    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        for (let i = 0; i < space.captures.length; i++) {
            const capture = space.captures[i];
            if (i > 0) pdf.addPage();
            
            const img = new Image();
            img.src = capture.imageData;
            await new Promise(resolve => { img.onload = resolve });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const availableWidth = pageWidth - (margin * 2);
            const availableHeight = pageHeight - (margin * 2);
            
            const imgRatio = img.width / img.height;
            let finalWidth, finalHeight;
            
            if (img.width > img.height) {
                finalWidth = availableWidth;
                finalHeight = finalWidth / imgRatio;
            } else {
                finalHeight = availableHeight;
                finalWidth = finalHeight * imgRatio;
            }

            if (finalHeight > availableHeight) {
                finalHeight = availableHeight;
                finalWidth = finalHeight * imgRatio;
            }
             if (finalWidth > availableWidth) {
                finalWidth = availableWidth;
                finalHeight = finalWidth / imgRatio;
            }

            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            pdf.addImage(capture.imageData, 'PNG', x, y, finalWidth, finalHeight);
            pdf.setFontSize(8);
            pdf.setTextColor(128, 128, 128);
            pdf.text(`Source: ${capture.source}, Page: ${capture.page}`, margin, pageHeight - 5);
        }
        
        const fileName = `${space.name.replace(/[^a-z0-9]/gi, '_')}_export.pdf`;
        pdf.save(fileName);
        showNotification('PDF exported successfully!', 'success');
    } catch (error) {
        showNotification(`Error exporting PDF: ${error.message}`, 'error');
        console.error("Export Error:", error);
    }
  };
  
  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all PDFs and spaces? This action cannot be undone.')) {
      setPdfDocuments([]);
      setSpaces([]);
      setActiveSpaceId(null);
      localStorage.removeItem('pdfWorkspaceSpaces');
      showNotification('All data cleared', 'success');
    }
  };

  return (
    <>
      <div className="cyber-grid"></div>
      <div className="container">
        <Header 
          onLoadClick={() => document.getElementById('fileInput').click()} 
          onCreateSpace={() => setIsModalOpen(true)}
          onClearAll={clearAll}
        />

        <div className="main-content">
<div className="pdf-viewers" id="pdfViewers">
  {pdfDocuments.length > 0 ? (
    // Find this line
    pdfDocuments.map((doc, index) => ( // <-- Add 'index' here
	      <PdfViewer 
		key={doc.id} 
		pdfData={doc}
		index={index} // <-- Pass the index as a prop
		onRemove={removePDF}
		onPageChange={updatePdfPage}
		onCapture={handleCapture}
	      />
	    ))
	) : (
              <div className="empty-state">
                <h3>🌌 READY FOR DIGITAL EXPLORATION</h3>
                <p>Load your PDFs to begin the cybernetic document journey</p>
              </div>
            )}
          </div>

          <SpacesPanel
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onCreateSpace={() => setIsModalOpen(true)}
            onSetActiveSpace={setActiveSpaceId}
            onDeleteSpace={deleteSpace}
            onExportSpace={exportSpaceAsPdf}
            onUpdateCaptures={updateSpaceCaptures}
          />
        </div>
      </div>

      <input 
        type="file" 
        id="fileInput" 
        className="file-input" 
        multiple 
        accept=".pdf"
        onChange={handleFileSelect}
      />
      
      {isModalOpen && (
        <CreateSpaceModal 
          onConfirm={confirmCreateSpace}
          onCancel={() => setIsModalOpen(false)}
        />
      )}

      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1001 }}>
        {notifications.map(n => (
          <Notification key={n.id} message={n.message} type={n.type} />
        ))}
      </div>
    </>
  );
}

export default App;
