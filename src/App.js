/**
 * Copyright (c) 2025 SoyMH
 *
 * This file is part of the PDF Workspace - Cyberpunk Edition project.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/build/pdf';
import { jsPDF } from "jspdf";
import { createPortal } from 'react-dom';

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
  const [zoomedCapture, setZoomedCapture] = useState(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const loadedPdfIdsRef = useRef([]);
  const pdfCacheRef = useRef(new Map());
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

  const toggleZenMode = useCallback(() => setIsZenMode(prev => !prev), []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isZenMode) {
        toggleZenMode();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZenMode, toggleZenMode]);
  useEffect(() => {
    if (isZenMode) {
      document.body.classList.add('zen-mode');
    } else {
      document.body.classList.remove('zen-mode');
    }
    return () => {
      document.body.classList.remove('zen-mode');
    };
  }, [isZenMode]);
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
      pdfCacheRef.current.forEach(pdf => {
        try { pdf.destroy(); } catch (e) { console.warn("Error destroying cached PDF:", e); }
      });
      pdfCacheRef.current.clear();
      loadedPdfIdsRef.current = [];
      return;
    }

    const currentPdfInfos = activeWorkspace.pdfDocuments || [];
    const currentPdfIds = currentPdfInfos.map(doc => doc.id).sort();
    const previousPdfIds = loadedPdfIdsRef.current.sort();

    const pdfsToKeepIds = new Set(currentPdfIds);
    pdfCacheRef.current.forEach((pdf, id) => {
      if (!pdfsToKeepIds.has(id)) {
        try { pdf.destroy(); } catch (e) { console.warn("Error destroying removed PDF:", e); }
        pdfCacheRef.current.delete(id);
      }
    });

    const loadOrUpdatePdfObjects = async () => {
      const pdfListChanged =
        currentPdfIds.length !== previousPdfIds.length ||
        currentPdfIds.some((id, index) => id !== previousPdfIds[index]);

      if (pdfListChanged) {
        showNotification(`Loading workspace '${activeWorkspace.name}'...`, 'info');
      }

      const loadedPdfs = await Promise.all(
        currentPdfInfos.map(async (docInfo) => {
          let pdf = pdfCacheRef.current.get(docInfo.id);

          if (!pdf) {
            const pdfRecord = await db.getPdf(docInfo.id);
            if (pdfRecord) {
          try {
                pdf = await getDocument(pdfRecord.data).promise;
                pdfCacheRef.current.set(docInfo.id, pdf);
    } catch (error) {
                showNotification(`Error loading ${docInfo.name}: ${error.message}`, 'error');
                return null;
    }
            }
          }

          if (pdf) {
            const currentPage = docInfo.currentPage || 1;
            return { id: docInfo.id, name: docInfo.name, pdf, currentPage, totalPages: pdf.numPages };
          }
          return null;
        })
  );

      setLivePdfDocs(loadedPdfs.filter(Boolean));
      loadedPdfIdsRef.current = currentPdfIds;
  };

    loadOrUpdatePdfObjects();
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

  const handleZoomCapture = useCallback((capture) => {
    setZoomedCapture(capture);
  }, []);
  const handleCloseZoom = useCallback(() => {
    setZoomedCapture(null);
  }, []);

  const handleZoomOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleCloseZoom();
    }
  }, [handleCloseZoom]);

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

  const updatePdfPage = async (pdfId, newPage) => {
    setLivePdfDocs(docs =>
      docs.map(doc =>
        doc.id === pdfId ? { ...doc, currentPage: newPage } : doc
      )
    );

    await updateWorkspace(w => ({
      ...w,
      pdfDocuments: w.pdfDocuments.map(doc =>
        doc.id === pdfId ? { ...doc, currentPage: newPage } : doc
      ),
    }));
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
            const lastPageIndex = updatedPages.length - 1;
            updatedPages = updatedPages.map((page, index) =>
              index === lastPageIndex
                ? { ...page, captures: [...page.captures, newCapture] }
                : page
  );
          } else {
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
    try {
      const space = spaces.find(s => s.id === spaceId);
      if (!space || !Array.isArray(space.pages)) {
        throw new Error('Invalid space or missing pages');
      }

      showNotification('info', 'Preparing PDF export...');

      const pdf = new jsPDF();
      let currentPage = 0;
      let hasContent = false;

      const pagesWithCaptures = space.pages.filter(page => 
        Array.isArray(page.captures) && page.captures.length > 0
      );

      if (pagesWithCaptures.length === 0) {
        throw new Error('No content to export - space is empty');
      }

      for (const page of pagesWithCaptures) {
        if (!page.renderedImage) {
          console.warn(`Page ${page.id} has no rendered image. Skipping.`);
          continue;
        }

        if (currentPage > 0) {
          pdf.addPage();
        }

      const img = new Image();
        img.src = page.renderedImage;

        try {
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(reject, 10000);
          });

          const imgWidth = img.naturalWidth;
          const imgHeight = img.naturalHeight;

          const ratio = Math.min(pdf.internal.pageSize.width / imgWidth, pdf.internal.pageSize.height / imgHeight);

          const finalWidth = imgWidth * ratio;
          const finalHeight = imgHeight * ratio;

          const x = (pdf.internal.pageSize.width - finalWidth) / 2;
          const y = (pdf.internal.pageSize.height - finalHeight) / 2;
          pdf.addImage(
            page.renderedImage,
            'PNG',
            x,
            y,
            finalWidth,
            finalHeight,
            undefined,
            'FAST'
          );
          hasContent = true;
          currentPage++;
          showNotification('info', `Processing page ${currentPage}...`);
        } catch (err) {
          console.error('Error adding rendered image to PDF:', err);
          showNotification('error', `Failed to add page image: ${err.message}`, 'error');
        continue;
        }
      }

      if (!hasContent) {
        throw new Error('No valid content found to export after processing rendered images.');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${space.name}_${timestamp}.pdf`;
      pdf.save(filename);
      showNotification('success', `PDF exported successfully as "${filename}"!`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showNotification('error', `Export Error: ${error.message}`);
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

  const updatePageCaptures = async (spaceId, pagesToUpdate) => {
    await updateWorkspace(w => ({
      ...w,
      spaces: w.spaces.map(space => {
        if (space.id === spaceId) {
          let newPages;
          if (Array.isArray(pagesToUpdate)) {
            newPages = pagesToUpdate;
          } else {
            newPages = space.pages.map(page =>
              page.id === pagesToUpdate.id ? pagesToUpdate : page
            );
          }
          return { ...space, pages: newPages };
        }
        return space;
      })
    }));
  };

  const moveCaptureBetweenPages = async (spaceId, captureId, fromPageId, toPageId, newIndex) => {
    await updateWorkspace(w => ({
      ...w,
      spaces: w.spaces.map(space => {
        if (space.id === spaceId) {
          let captureToMove = null;

          const sourcePage = space.pages.find(p => p.id.toString() === fromPageId);
          if (sourcePage) {
            captureToMove = sourcePage.captures.find(c => c.id.toString() === captureId);
          }

          if (!captureToMove) {
            console.error("Capture to move not found!");
            console.error("Debug Info - moveCaptureBetweenPages:");
            console.error("  spaceId:", spaceId);
            console.error("  captureId (from DOM):", captureId);
            console.error("  fromPageId (from DOM):", fromPageId);
            console.error("  toPageId (from DOM):", toPageId);
            console.error("  sourcePage found:", !!sourcePage);
            if (sourcePage) {
              console.error("  sourcePage.id (in state):", sourcePage.id);
              console.error("  sourcePage.captures IDs (in state):", sourcePage.captures.map(c => c.id));
            }
            return space;
          }

          const newPages = space.pages.map(page => {
            if (page.id.toString() === fromPageId) {
              return { ...page, captures: page.captures.filter(c => c.id.toString() !== captureId) };
            }
            else if (page.id.toString() === toPageId) {
              const newCaptures = [...page.captures];
              newCaptures.splice(newIndex, 0, captureToMove);
              return { ...page, captures: newCaptures };
            }
            return page;
          });

          return { ...space, pages: newPages };
        }
        return space;
      })
    }));
    showNotification('Capture moved!', 'success');
  };

  const deleteCaptureFromSpacePage = async (spaceId, pageId, captureId) => {
    await updateWorkspace(w => ({
      ...w,
      spaces: w.spaces.map(space => {
        if (space.id === spaceId) {
          const updatedPages = space.pages.map(page => {
            if (page.id.toString() === pageId.toString()) {
              return { ...page, captures: page.captures.filter(c => c.id.toString() !== captureId.toString()) };
            }
            return page;
          });
          return { ...space, pages: updatedPages };
        }
        return space;
      })
    }));
    showNotification('Capture deleted!', 'success');
  };

  return (
    <>
      <div className="cyber-grid"></div>

      <WorkspacesPanel
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSetActive={handleSetActiveWorkspace}
        onCreate={() => setIsWorkspaceModalOpen(true)}
        isZenMode={isZenMode}
      />

      <div className="container">
        <Header
          onLoadClick={() => activeWorkspaceId && document.getElementById('fileInput').click()}
          onCreateSpace={() => activeWorkspaceId && setIsSpaceModalOpen(true)}
          onCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
          onClearAll={clearAll}
          isZenMode={isZenMode}
          toggleZenMode={toggleZenMode}
        />

        <div className="main-content">
          <div
            className="pdf-viewers"
            id="pdfViewers"
            style={{ '--pdf-count': livePdfDocs.length || 1 }}
          >
            {livePdfDocs.length > 0 ? (
              livePdfDocs.map((doc, index) => (
                <PdfViewer
                  key={doc.id}
                  pdfData={doc}
                  index={index}
                  onRemove={removePDF}
                  onPageChange={updatePdfPage}
                  onCapture={handleCapture}
                  onZoomCapture={handleZoomCapture}
                  isZenMode={isZenMode}
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
            onAddNewPage={addNewPageToSpace}
            onDeletePage={deletePageFromSpace}
            onMoveCapturesBetweenPages={moveCaptureBetweenPages}
            onZoomCapture={handleZoomCapture}
            onCloseZoom={handleCloseZoom}
            showNotification={showNotification}
            onDeleteCapture={deleteCaptureFromSpacePage}
            isZenMode={isZenMode}
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

      {zoomedCapture && createPortal(
        <div className="zoom-overlay" onClick={handleZoomOverlayClick}>
          <img
            src={zoomedCapture.imageData}
            className="capture-thumbnail-zoom"
            alt="Zoomed capture"
          />
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: 'rgba(147, 51, 234, 0.9)',
              color: 'white',
              padding: '10px 15px',
              borderRadius: '8px',
              cursor: 'pointer',
              zIndex: 1001,
              fontSize: '18px',
              fontWeight: 'bold'
            }}
            onClick={handleCloseZoom}
          >
            ✕
          </div>
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '20px',
              fontSize: '14px'
            }}
          >
            From: {zoomedCapture.source} | Page: {zoomedCapture.page} | Click outside to close
          </div>
        </div>,
        document.body
      )}

      {isZenMode && createPortal(
        <button
          className="zen-exit-button"
          onClick={toggleZenMode}
          title="Exit Zen Mode (Esc)"
        >
          ✖️ Exit Zen
        </button>,
        document.body
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

