import React, { useState, useEffect, useCallback } from 'react';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import { jsPDF } from "jspdf";

import * as db from './db';

import Header from './components/Header';
import PdfViewer from './components/PdfViewer';
import SpacesPanel from './components/SpacesPanel';
import CreateSpaceModal from './components/CreateSpaceModal';
import CreateWorkspaceModal from './components/CreateWorkspaceModal';
import WorkspacesPanel from './components/WorkspacesPanel';
import Notification from './components/Notification';
import './App.css';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function App() {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [livePdfDocs, setLivePdfDocs] = useState([]);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const spaces = activeWorkspace ? activeWorkspace.spaces : [];
  const activeSpaceId = activeWorkspace ? activeWorkspace.activeSpaceId : null;
  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      const allWorkspaces = await db.getAllWorkspaces();
      if (allWorkspaces.length > 0) {
        setWorkspaces(allWorkspaces);
        const lastActiveId = JSON.parse(localStorage.getItem('pdfLastActiveWorkspaceId'));
        setActiveWorkspaceId(lastActiveId || allWorkspaces[0].id);
      } else {
        const defaultWorkspace = {
          id: Date.now(), name: 'Main Workspace', pdfDocuments: [], spaces: [], activeSpaceId: null,
        };
        await db.saveWorkspace(defaultWorkspace);
        setWorkspaces([defaultWorkspace]);
        setActiveWorkspaceId(defaultWorkspace.id);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!activeWorkspace) {
      setLivePdfDocs([]);
      return;
    }

    const loadPdfObjects = async () => {
      showNotification(`Loading workspace '${activeWorkspace.name}'...`, 'info');
      const pdfsToLoad = activeWorkspace.pdfDocuments || [];
    const loadedPdfs = await Promise.all(
        pdfsToLoad.map(async (docInfo) => {
          const pdfRecord = await db.getPdf(docInfo.id);
          if (pdfRecord) {
          try {
              const pdf = await require('pdfjs-dist').getDocument(pdfRecord.data).promise;
              return { id: docInfo.id, name: docInfo.name, pdf, currentPage: 1, totalPages: pdf.numPages };
            } catch (error) {
              showNotification(`Error loading ${docInfo.name}: ${error.message}`, 'error');
            return null;
          }
          }
        return null;
      })
    );
      setLivePdfDocs(loadedPdfs.filter(Boolean));
  };

    loadPdfObjects();
  }, [activeWorkspace, showNotification]);

  useEffect(() => {
    const notificationId = setTimeout(() => {
    showNotification('🌟 Welcome to PDF Workspace - Cyberpunk Edition! 🌟', 'success');
    }, 1000);

    return () => clearTimeout(notificationId);
  }, [showNotification]);

  const handleCreateWorkspace = async (name) => {
    const newWorkspace = { id: Date.now(), name, pdfDocuments: [], spaces: [], activeSpaceId: null };
    await db.saveWorkspace(newWorkspace);
    setWorkspaces(prev => [...prev, newWorkspace]);
    setActiveWorkspaceId(newWorkspace.id);
    setIsWorkspaceModalOpen(false);
    showNotification(`Workspace "${name}" created!`, 'success');
  };

  const handleSetActiveWorkspace = (id) => {
    setActiveWorkspaceId(id);
    localStorage.setItem('pdfLastActiveWorkspaceId', JSON.stringify(id));
  };
  
  const updateWorkspace = async (updater) => {
      const updatedWorkspace = updater(activeWorkspace);
      await db.saveWorkspace(updatedWorkspace);
      setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? updatedWorkspace : w));
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files).filter(f => f.type === 'application/pdf');
    if (files.length === 0) return;

    showNotification(`Storing ${files.length} PDF(s)...`, 'info');

    const newPdfInfos = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfId = Date.now() + Math.random();
      await db.savePdf({ id: pdfId, data: arrayBuffer });
      newPdfInfos.push({ id: pdfId, name: file.name });
    }
    await updateWorkspace(w => ({
      ...w,
      pdfDocuments: [...w.pdfDocuments, ...newPdfInfos],
    }));
    showNotification('PDFs loaded successfully!', 'success');
  };
    
  const removePDF = async (pdfId) => {
    await db.deletePdf(pdfId);
    await updateWorkspace(w => ({
      ...w,
      pdfDocuments: w.pdfDocuments.filter(doc => doc.id !== pdfId),
    }));
  };

  const updatePdfPage = (pdfId, newPage) => {
    setLivePdfDocs(docs =>
      docs.map(doc =>
        doc.id === pdfId ? { ...doc, currentPage: newPage } : doc
      )
    );
  };

  const setActiveSpaceId = async (spaceId) => {
    await updateWorkspace(w => ({ ...w, activeSpaceId: spaceId }));
              };

  const handleCapture = async (imageData, sourcePdf) => {
    if (!activeSpaceId) {
      showNotification('Select a space first or create a new one', 'warning');
      return;
            }
    await updateWorkspace(w => ({
      ...w,
      spaces: w.spaces.map(space => {
        if (space.id === w.activeSpaceId) {
          const newCapture = {
            id: Date.now() + Math.random(),
            imageData: imageData,
            source: sourcePdf.name,
            page: sourcePdf.currentPage,
            timestamp: new Date().toISOString()
          };

          let updatedPages = space.pages || [];

          if (updatedPages.length > 0) {
            // Add the new capture to the last page of the space
            const lastPageIndex = updatedPages.length - 1;
            updatedPages = updatedPages.map((page, index) =>
              index === lastPageIndex
                  ? { ...page, captures: [...page.captures, newCapture] }
                  : page
            );
            } else {
            // If no pages exist, create the first page and add the capture
            updatedPages = [{ id: Date.now(), captures: [newCapture] }];
          }
          return { ...space, pages: updatedPages };
        }
        return space;
      })
    }));
    showNotification('Capture added to space!', 'success');
  };

  const confirmCreateSpace = async (name) => {
    const newSpace = {
      id: Date.now() + Math.random(),
      name: name,
      pages: [{ id: Date.now(), captures: [] }],
      created: new Date().toISOString()
    };
    await updateWorkspace(w => ({
      ...w,
      spaces: [...w.spaces, newSpace],
      activeSpaceId: newSpace.id
    }));
    setIsSpaceModalOpen(false);
    showNotification(`Space "${name}" created!`, 'success');
  };

  const deleteSpace = async (spaceId) => {
    if (window.confirm('Are you sure you want to delete this space? This action cannot be undone.')) {
      await updateWorkspace(w => ({
        ...w,
        spaces: w.spaces.filter(s => s.id !== spaceId),
        activeSpaceId: w.activeSpaceId === spaceId ? null : w.activeSpaceId
      }));
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

  const layoutCapturesOnPdfPage = async (pdf, captures, pageWidth, pageHeight, margin) => {
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

  const clearAll = async () => {
    if (window.confirm('Are you sure you want to clear all PDFs and spaces? This action cannot be undone.')) {
      await setWorkspaces([]);
      await setActiveWorkspaceId(null);
      localStorage.removeItem('pdfWorkspaces');
      localStorage.removeItem('pdfLastActiveWorkspaceId');
      showNotification('All data cleared', 'success');
    }
  };

  const addNewPageToSpace = async (spaceId) => {
    await updateWorkspace(w => ({
      ...w,
      spaces: w.spaces.map(space => {
        if (space.id === spaceId) {
          const newPage = { id: Date.now() + Math.random(), captures: [] };
          return { ...space, pages: [...(space.pages || []), newPage] };
        }
        return space;
      })
    }));
    showNotification('New page added to space!', 'success');
  };

  const deletePageFromSpace = async (spaceId, pageId) => {
    await updateWorkspace(w => ({
      ...w,
      spaces: w.spaces.map(space => {
        if (space.id === spaceId) {
          const updatedPages = space.pages.filter(page => page.id !== pageId);
          return { ...space, pages: updatedPages };
        }
        return space;
      })
    }));
    showNotification('Page deleted!', 'success');
  };

  const updatePageCaptures = async (spaceId, pageId, newCaptures) => {
    await updateWorkspace(w => ({
      ...w,
      spaces: w.spaces.map(space => {
        if (space.id === spaceId) {
          const updatedPages = space.pages.map(page => {
            if (page.id === pageId) {
              // Remove duplicates based on capture ID
              const uniqueCaptures = newCaptures.filter((capture, index, self) => 
                index === self.findIndex(c => c.id === capture.id)
              );
              return { ...page, captures: uniqueCaptures };
            } else {
              // Remove any captures that now exist in the target page
              const newCaptureIds = newCaptures.map(c => c.id);
              return {
                ...page,
                captures: page.captures.filter(c => !newCaptureIds.includes(c.id))
              };
            }
          });
          return { ...space, pages: updatedPages };
        }
        return space;
      })
    }));
  };
  const handleCaptureMove = async (spaceId, targetPageId, newCaptures, captureItem) => {
    await updateWorkspace(w => ({
      ...w,
      spaces: w.spaces.map(space => {
        if (space.id === spaceId) {
          const updatedPages = space.pages.map(page => {
            if (page.id === targetPageId) {
              // Add to target page (remove duplicates first)
              const existingIds = page.captures.map(c => c.id);
              const filteredNewCaptures = newCaptures.filter(c => !existingIds.includes(c.id));
              return { ...page, captures: [...page.captures, ...filteredNewCaptures] };
            } else {
              // Remove from source pages
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
    }));
  };
  const moveCaptureBetweenPages = async (spaceId, captureId, fromPageId, toPageId) => {
    await updateWorkspace(w => ({
      ...w,
      spaces: w.spaces.map(space => {
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
    }));
  };

  return (
    <>
      <div className="cyber-grid"></div>

      <WorkspacesPanel
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSetActive={handleSetActiveWorkspace}
        onCreate={() => setIsWorkspaceModalOpen(true)}
      />

      <div className="container" style={{ marginLeft: '250px' }}>
        <Header
          onLoadClick={() => activeWorkspaceId && document.getElementById('fileInput').click()}
          onCreateSpace={() => activeWorkspaceId && setIsSpaceModalOpen(true)}
          onCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
          onClearAll={clearAll}
        />

        <div className="main-content" style={{ marginLeft: 0 }}>
          <div className="pdf-viewers" id="pdfViewers">
            {livePdfDocs.length > 0 ? (
              livePdfDocs.map((doc, index) => (
                <PdfViewer
                  key={doc.id}
                  pdfData={doc}
                  index={index}
                  onRemove={removePDF}
                  onPageChange={updatePdfPage}
                  onCapture={handleCapture}
                />
              ))
            ) : (
              <div className="empty-state">
                <h3>🌌 READY FOR DIGITAL EXPLORATION</h3>
                <p>{activeWorkspace ? 'Load your PDFs to begin.' : 'Create or select a workspace.'}</p>
              </div>
            )}
          </div>

          <SpacesPanel
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onCreateSpace={() => activeWorkspaceId && setIsSpaceModalOpen(true)}
            onSetActiveSpace={setActiveSpaceId}
            onDeleteSpace={deleteSpace}
            onExportSpace={exportSpaceAsPdf}
            onUpdateCaptures={updatePageCaptures}
            onCaptureMove={handleCaptureMove}
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
        disabled={!activeWorkspaceId}
      />

      {isSpaceModalOpen && (
        <CreateSpaceModal
          onConfirm={confirmCreateSpace}
          onCancel={() => setIsSpaceModalOpen(false)}
        />
      )}

      {isWorkspaceModalOpen && (
        <CreateWorkspaceModal
          onConfirm={handleCreateWorkspace}
          onCancel={() => setIsWorkspaceModalOpen(false)}
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

