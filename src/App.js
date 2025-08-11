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

const migrateOldSpacesToNewFormat = (spaces) => {
  return spaces.map(space => {
    // If space has old 'captures' format, migrate it
    if (space.captures && !space.pages) {
      return {
        ...space,
        pages: space.captures.length > 0 
          ? [{ id: Date.now() + Math.random(), captures: space.captures }]
          : [],
        // Remove old captures property
        captures: undefined
      };
    }
    // If space already has pages format or no captures, return as is
    return space.pages ? space : { ...space, pages: [] };
  });
};

function App() {
  const [pdfDocuments, setPdfDocuments] = useState([]);
  const [spaces, setSpaces] = useState(() => {
    const savedSpaces = localStorage.getItem('pdfWorkspaceSpaces');
    const parsedSpaces = savedSpaces ? JSON.parse(savedSpaces) : [];
    return migrateOldSpacesToNewFormat(parsedSpaces);
  });
  const [activeSpaceId, setActiveSpaceId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  // Effect to save spaces to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pdfWorkspaceSpaces', JSON.stringify(spaces));
  }, [spaces]);
  
  // Welcome notification on first load
  useEffect(() => {
    const notificationId = setTimeout(() => {
    showNotification('🌟 Welcome to PDF Workspace - Cyberpunk Edition! 🌟', 'success');
    }, 1000); // Delay to ensure UI is ready

    return () => clearTimeout(notificationId);
  }, [showNotification]);

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
          
          // Add to first page by default, or create first page if none exist
          const updatedPages = space.pages && space.pages.length > 0 
            ? space.pages.map((page, index) => 
                index === 0 
                  ? { ...page, captures: [...page.captures, newCapture] }
                  : page
              )
            : [{ id: Date.now(), captures: [newCapture] }];
            
          return { ...space, pages: updatedPages };
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
      pages: [{ id: Date.now(), captures: [] }], // Change to pages structure
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
  
  const exportSpaceAsPdf = async (spaceId) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space || !space.pages || space.pages.length === 0) {
      showNotification('No captures to export', 'warning');
      return;
    }
    
    const totalCaptures = space.pages.reduce((sum, page) => sum + page.captures.length, 0);
    if (totalCaptures === 0) {
      showNotification('No captures to export', 'warning');
      return;
    }
    
    showNotification('Generating PDF...', 'info');
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;
      
      for (const page of space.pages) {
        if (page.captures.length === 0) continue;
        
        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        
        // Layout captures on the page
        await layoutCapturesOnPdfPage(pdf, page.captures, pageWidth, pageHeight, margin);
      }
      
      const fileName = `${space.name.replace(/[^a-z0-9]/gi, '_')}_export.pdf`;
      pdf.save(fileName);
      showNotification('PDF exported successfully!', 'success');
    } catch (error) {
      showNotification(`Error exporting PDF: ${error.message}`, 'error');
      console.error("Export Error:", error);
    }
  };

  // Helper function for layout logic
  const layoutCapturesOnPdfPage = async (pdf, captures, pageWidth, pageHeight, margin) => {
    // Simple layout: stack vertically, but you can enhance this
    const availableHeight = pageHeight - (margin * 2);
    const captureHeight = availableHeight / captures.length;
    
    for (let i = 0; i < captures.length; i++) {
      const capture = captures[i];
      const img = new Image();
      img.src = capture.imageData;
      await new Promise(resolve => { img.onload = resolve });
      
      const y = margin + (i * captureHeight);
      const availableWidth = pageWidth - (margin * 2);
      
      pdf.addImage(capture.imageData, 'PNG', margin, y, availableWidth, captureHeight - 5);
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

  const addNewPageToSpace = (spaceId) => {
    setSpaces(prevSpaces =>
      prevSpaces.map(space => {
        if (space.id === spaceId) {
          const newPage = { id: Date.now() + Math.random(), captures: [] };
          return { ...space, pages: [...(space.pages || []), newPage] };
        }
        return space;
      })
    );
    showNotification('New page added to space!', 'success');
  };

  const deletePageFromSpace = (spaceId, pageId) => {
    setSpaces(prevSpaces =>
      prevSpaces.map(space => {
        if (space.id === spaceId) {
          const updatedPages = space.pages.filter(page => page.id !== pageId);
          return { ...space, pages: updatedPages };
        }
        return space;
      })
    );
    showNotification('Page deleted!', 'success');
  };

  const updatePageCaptures = (spaceId, pageId, newCaptures) => {
    setSpaces(prevSpaces =>
      prevSpaces.map(space => {
        if (space.id === spaceId) {
          const updatedPages = space.pages.map(page =>
            page.id === pageId ? { ...page, captures: newCaptures } : page
          );
          return { ...space, pages: updatedPages };
        }
        return space;
      })
    );
  };
  const handleCaptureMove = (spaceId, pageId, newCaptures, captureItem) => {
    setSpaces(prevSpaces =>
      prevSpaces.map(space => {
        if (space.id === spaceId) {
          const updatedPages = space.pages.map(page => {
            if (page.id === pageId) {
              // This is the target page, set the new captures
              return { ...page, captures: newCaptures };
            } else {
              // Remove the moved capture from other pages in the same space
              return {
                ...page,
                captures: page.captures.filter(capture => capture.id !== captureItem.id)
              };
            }
          });
          return { ...space, pages: updatedPages };
        }
        return space;
      })
    );
  };
  const moveCaptureBetweenPages = (spaceId, captureId, fromPageId, toPageId) => {
    setSpaces(prevSpaces =>
      prevSpaces.map(space => {
        if (space.id === spaceId) {
          let captureToMove = null;
          const updatedPages = space.pages.map(page => {
            if (page.id === fromPageId) {
              captureToMove = page.captures.find(c => c.id === captureId);
              return { ...page, captures: page.captures.filter(c => c.id !== captureId) };
            } else if (page.id === toPageId && captureToMove) {
              return { ...page, captures: [...page.captures, captureToMove] };
            }
            return page;
          });
          return { ...space, pages: updatedPages };
        }
        return space;
      })
    );
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
            onUpdateCaptures={updatePageCaptures}
            onCaptureMove={handleCaptureMove} // Add this new prop
            onAddNewPage={addNewPageToSpace}
            onDeletePage={deletePageFromSpace}
            onMoveCapturesBetweenPages={moveCaptureBetweenPages}
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

