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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'; // Add PDFDocument, rgb, StandardFonts for PDF reconstruction
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
import upscaleImage from './upscaleImage'; // Import the new upscaleImage module
import './App.css';
import { backend } from '@tensorflow/tfjs';

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
  const [isSinglePdfZenMode, setIsSinglePdfZenMode] = useState(false);
  const [activeSinglePdfIndex, setActiveSinglePdfIndex] = useState(0);
  const [upscalingPdfId, setUpscalingPdfId] = useState(null); // Track upscaling status
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

  const toggleZenMode = useCallback(() => {
    setIsZenMode(prev => {
      // When exiting Zen mode, also reset single PDF mode
      if (prev) {
        setIsSinglePdfZenMode(false);
        setActiveSinglePdfIndex(0); // Reset to first PDF
      }
      return !prev;
    });
  }, []);

  // NEW: Toggle for single PDF within Zen mode
  const toggleSinglePdfZenMode = useCallback(() => {
    setIsSinglePdfZenMode(prev => !prev);
  }, []);

  const handleSinglePdfChange = useCallback((pdfIndex) => {
    if (pdfIndex >= 0 && pdfIndex < livePdfDocs.length) {
      setActiveSinglePdfIndex(pdfIndex);
    } else {
      showNotification(`PDF number ${pdfIndex + 1} does not exist.`, 'warning');
    }
  }, [livePdfDocs, showNotification]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isZenMode) {
        toggleZenMode();
      }
      if (isZenMode && isSinglePdfZenMode && event.key >= '1' && event.key <= '9') {
        const pdfNumber = parseInt(event.key, 10);
        handleSinglePdfChange(pdfNumber - 1);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZenMode, toggleZenMode, isSinglePdfZenMode, handleSinglePdfChange]);

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
          let pdfDataFromDb = null; // Variable to store ArrayBuffer

          if (!pdf) {
            const pdfRecord = await db.getPdf(docInfo.id);
            if (pdfRecord) {
              try {
                pdf = await getDocument(pdfRecord.data).promise;
                pdfCacheRef.current.set(docInfo.id, pdf);
                pdfDataFromDb = pdfRecord.data; // Store the ArrayBuffer
              } catch (error) {
                showNotification(`Error loading ${docInfo.name}: ${error.message}`, 'error');
                return null;
              }
            }
          } else {
            // If PDF is already in cache, retrieve its data from DB if not already stored
            const pdfRecord = await db.getPdf(docInfo.id);
            if (pdfRecord) {
              pdfDataFromDb = pdfRecord.data;
            }
          }

          if (pdf) {
            const currentPage = docInfo.currentPage || 1;
            return { id: docInfo.id, name: docInfo.name, pdf, currentPage, totalPages: pdf.numPages, data: pdfDataFromDb }; // Pass the ArrayBuffer here
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

  // New handleUpscale function for single page
  const handleUpscale = async (pdfId, pageNumber, imageData) => {
    setUpscalingPdfId(pdfId);
    showNotification(`Upscaling page ${pageNumber} of PDF ID ${pdfId}... This may take a moment.`, 'info');
    console.log(`App.js: Starting upscale for PDF ${pdfId}, page ${pageNumber}. Input imageData dimensions: ${imageData.width}x${imageData.height}.`);

    try {
      const pdfRecord = await db.getPdf(pdfId);
      if (!pdfRecord || !pdfRecord.data) {
        throw new Error("Original PDF data not found in DB.");
      }
      console.log("App.js: Original PDF data fetched from DB.");

      const originalPdfBytes = pdfRecord.data;
      const pdfjsDoc = await getDocument({ data: originalPdfBytes }).promise;
      const totalPages = pdfjsDoc.numPages;
      console.log(`App.js: Original PDF has ${totalPages} pages.`);

      console.log("App.js: Calling upscaleImage module...");
      const upscaledImageResult = await upscaleImage(imageData);
      console.log(`App.js: Received upscaled image data. Type: ${typeof upscaledImageResult.data}, Length: ${upscaledImageResult.data.length}.`);
      if (!upscaledImageResult.data || upscaledImageResult.data.length === 0) {
          throw new Error("Upscaled image data is empty or invalid.");
      }
      console.log("App.js: First few bytes of upscaled image data:", upscaledImageResult.data.slice(0, 10));

      // Convert upscaled Uint8ClampedArray to PNG Data URL
      console.log("App.js: Converting upscaled image data to PNG Data URL...");
      const upscaledCanvas = document.createElement('canvas');
      upscaledCanvas.width = upscaledImageResult.width;
      upscaledCanvas.height = upscaledImageResult.height;
      const upscaledContext = upscaledCanvas.getContext('2d');
      const upscaledImageDataObj = new ImageData(upscaledImageResult.data, upscaledImageResult.width, upscaledImageResult.height);
      upscaledContext.putImageData(upscaledImageDataObj, 0, 0);
      const upscaledPngDataUrl = upscaledCanvas.toDataURL('image/png');
      console.log("App.js: Upscaled image converted to PNG Data URL. Length:", upscaledPngDataUrl.length);

      const newPdfDoc = await PDFDocument.create();
      console.log("App.js: Created new PDFDocument for reconstruction.");

      for (let i = 1; i <= totalPages; i++) {
        if (i === pageNumber) {
          // This is the page to replace with the upscaled image
          console.log(`App.js: Embedding upscaled image for page ${i}.`);
          const image = await newPdfDoc.embedPng(upscaledPngDataUrl);
          const page = newPdfDoc.addPage();
          
          const { width: imgWidth, height: imgHeight } = image;
          const pageWidth = page.getWidth();
          const pageHeight = page.getHeight();

          const imgAspectRatio = imgWidth / imgHeight;
          const pageAspectRatio = pageWidth / pageHeight;

          let finalWidth = pageWidth;
          let finalHeight = pageHeight;

          if (imgAspectRatio > pageAspectRatio) {
            finalHeight = pageWidth / imgAspectRatio;
          } else {
            finalWidth = pageHeight * imgAspectRatio;
          }

          page.drawImage(image, {
            x: (pageWidth - finalWidth) / 2,
            y: (pageHeight - finalHeight) / 2,
            width: finalWidth,
            height: finalHeight,
          });
          console.log(`App.js: Upscaled image embedded on page ${i}.`)
        } else {
          // For other pages, render original page to canvas and embed
          console.log(`App.js: Re-embedding original page ${i}.`);
          const originalPage = await pdfjsDoc.getPage(i);
          const viewport = originalPage.getViewport({ scale: 2.0 }); // Render at a good quality

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await originalPage.render({ canvasContext: context, viewport: viewport }).promise;
          const originalPageImageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          // Convert original page ImageData to PNG Data URL before embedding
          console.log(`App.js: Converting original page ${i} ImageData to PNG Data URL...`);
          const originalPageCanvas = document.createElement('canvas');
          originalPageCanvas.width = originalPageImageData.width;
          originalPageCanvas.height = originalPageImageData.height;
          const originalPageContext = originalPageCanvas.getContext('2d');
          originalPageContext.putImageData(originalPageImageData, 0, 0);
          const originalPagePngDataUrl = originalPageCanvas.toDataURL('image/png');
          console.log(`App.js: Original page ${i} converted to PNG Data URL. Length: ${originalPagePngDataUrl.length}`);

          const image = await newPdfDoc.embedPng(originalPagePngDataUrl); // Embed original page image as Data URL
          const page = newPdfDoc.addPage();

          const { width: imgWidth, height: imgHeight } = image;
          const pageWidth = page.getWidth();
          const pageHeight = page.getHeight();

          const imgAspectRatio = imgWidth / imgHeight;
          const pageAspectRatio = pageWidth / pageHeight;

          let finalWidth = pageWidth;
          let finalHeight = pageHeight;

          if (imgAspectRatio > pageAspectRatio) {
            finalHeight = pageWidth / imgAspectRatio;
          } else {
            finalWidth = pageHeight * imgAspectRatio;
          }

          page.drawImage(image, {
            x: (pageWidth - finalWidth) / 2,
            y: (pageHeight - finalHeight) / 2,
            width: finalWidth,
            height: finalHeight,
          });
          console.log(`App.js: Original page ${i} re-embedded.`);
        }
      }
      
      console.log("App.js: Saving new PDF bytes...");
      const newPdfBytes = await newPdfDoc.save();
      console.log("App.js: New PDF bytes saved. Size:", newPdfBytes.byteLength);

      // Overwrite the original PDF in DB with the new PDF data
      console.log(`App.js: Overwriting PDF ID ${pdfId} in DB.`);
      await db.savePdf({ id: pdfId, data: newPdfBytes });
      
      // Invalidate PDF.js cache for this PDF and reload it to reflect changes
      console.log(`App.js: Invalidating PDF cache for ID ${pdfId} and triggering reload.`);
      const pdfInstanceToDestroy = pdfCacheRef.current.get(pdfId);
      if (pdfInstanceToDestroy) {
        try { pdfInstanceToDestroy.destroy(); } catch (e) { console.warn("Error destroying old PDF instance:", e); }
        pdfCacheRef.current.delete(pdfId);
      }
      // Trigger re-load of the specific PDF document in livePdfDocs
      setLivePdfDocs(prevDocs => prevDocs.map(doc => 
        doc.id === pdfId ? { ...doc, pdf: null, data: newPdfBytes } : doc
      ));
      showNotification(`Page ${pageNumber} of PDF ID ${pdfId} upscaled and updated!`, 'success');

    } catch (error) {
      console.error("App.js: Error during single page upscaling and PDF reconstruction:", error);
      showNotification(`Failed to upscale and update page: ${error.message}`, 'error');
    } finally {
      setUpscalingPdfId(null);
    }
  };



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
    if (window.confirm('Are you sure you want to clear ALL workspaces and their PDFs? This action cannot be undone.')) {
      await db.deleteAllWorkspaces();
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      // No need to clear localStorage for workspaces now, as db.deleteAllWorkspaces handles the data itself
      localStorage.removeItem('pdfLastActiveWorkspaceId'); // Still clear last active ID
      showNotification('All workspaces and PDFs cleared!', 'success');
    }
  };

  const handleRenameWorkspace = async (workspaceId, newName) => {
    const currentWorkspace = workspaces.find(w => w.id === workspaceId);
    if (!currentWorkspace) return;

    const trimmedName = newName.trim();

    // Only update if the name has actually changed and is not empty
    if (trimmedName && trimmedName !== currentWorkspace.name) {
      const updatedWorkspace = { ...currentWorkspace, name: trimmedName };
      await db.saveWorkspace(updatedWorkspace);
      setWorkspaces(prev =>
        prev.map(w =>
          w.id === workspaceId ? updatedWorkspace : w
        )
      );
      showNotification(`Workspace renamed to "${trimmedName}"!`, 'success');
    }
  };

  const handleDeleteWorkspace = async (workspaceId) => {
    if (window.confirm('Are you sure you want to delete this workspace and all its associated data (PDFs, spaces, captures)? This action cannot be undone.')) {
      await db.deleteWorkspace(workspaceId);
      setWorkspaces(prev => {
        const updatedWorkspaces = prev.filter(w => w.id !== workspaceId);
        if (workspaceId === activeWorkspaceId) {
          setActiveWorkspaceId(updatedWorkspaces.length > 0 ? updatedWorkspaces[0].id : null);
          localStorage.setItem('pdfLastActiveWorkspaceId', JSON.stringify(updatedWorkspaces.length > 0 ? updatedWorkspaces[0].id : null));
        }
        return updatedWorkspaces;
      });
      showNotification('Workspace and its data deleted!', 'success');
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

  const pdfsToRender = isZenMode && isSinglePdfZenMode
    ? (livePdfDocs.length > 0 ? [livePdfDocs[activeSinglePdfIndex]] : [])
    : livePdfDocs;

  const handleExportWorkspace = async () => {
    if (!activeWorkspace) {
      showNotification('No active workspace to export.', 'warning');
      return;
    }

    try {
      showNotification('Preparing workspace for export...', 'info');

      // Create a deep copy to modify for export, if needed, but primarily to add binaries
      const workspaceToExport = JSON.parse(JSON.stringify(activeWorkspace)); // Deep copy to avoid modifying live state

      // --- Fetch PDF binaries and embed them for export ---
      const pdfsWithBinaries = await Promise.all(
        workspaceToExport.pdfDocuments.map(async (docInfo) => {
          const pdfRecord = await db.getPdf(docInfo.id);
          if (pdfRecord && pdfRecord.data) {
            // Convert ArrayBuffer to Base64 string for JSON serialization
            const base64Pdf = btoa(
              new Uint8Array(pdfRecord.data)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            return {
              ...docInfo,
              data: base64Pdf, // Embed the base64 PDF binary
              currentPage: docInfo.currentPage // Ensure current page is included (already there)
            };
          }
          return docInfo; // Return original info if binary not found (though it should be)
        })
      );
      workspaceToExport.pdfDocuments = pdfsWithBinaries;

      // Captured sections (imageData as Data URLs) are already part of spaces.pages.captures
      // and will be serialized correctly by JSON.stringify.

      const filename = `${workspaceToExport.name.replace(/\s/g, '_')}_full_export.json`;
      const json = JSON.stringify(workspaceToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const href = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      showNotification(`Workspace "${workspaceToExport.name}" exported successfully (full data)!`, 'success');
    } catch (error) {
      console.error('Error exporting workspace:', error);
      showNotification(`Failed to export workspace: ${error.message}`, 'error');
    }
  };

  const handleImportWorkspace = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // Basic validation for full export format
        if (!importedData || !importedData.id || !importedData.name || !Array.isArray(importedData.pdfDocuments) || !Array.isArray(importedData.spaces)) {
          showNotification('Invalid workspace file format. Missing essential data.', 'error');
          return;
        }

        // --- Handle PDF binaries from import ---
        const newPdfDocsForDb = [];
        const newPdfDocumentsMetadata = []; // Metadata to store in workspace object
        const oldToNewPdfIdMap = new Map(); // Map original PDF IDs to new ones

        for (const docInfo of importedData.pdfDocuments) {
            if (docInfo.data) { // If binary data is present
                // Convert Base64 string back to ArrayBuffer
                const binaryString = atob(docInfo.data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const newPdfId = Date.now() + Math.random(); // Generate new ID for imported PDF
                newPdfDocsForDb.push({ id: newPdfId, data: bytes.buffer });
                oldToNewPdfIdMap.set(docInfo.id, newPdfId); // Store mapping

                // Create new metadata for the workspace (without the binary data)
                newPdfDocumentsMetadata.push({
                    id: newPdfId,
                    name: docInfo.name,
                    currentPage: docInfo.currentPage || 1 // Keep current page
                });
            } else {
                // If no binary data, treat as a broken reference or older export, generate new ID
                const newPdfId = Date.now() + Math.random();
                oldToNewPdfIdMap.set(docInfo.id, newPdfId);
                newPdfDocumentsMetadata.push({
                    id: newPdfId,
                    name: docInfo.name,
                    currentPage: docInfo.currentPage || 1
                });
                showNotification(`PDF "${docInfo.name}" had no binary data. Re-import PDF if needed.`, 'warning');
            }
        }

        // Store PDF binaries in IndexedDB
        for (const pdfDoc of newPdfDocsForDb) {
            await db.savePdf(pdfDoc);
        }

        // Assign new unique IDs to workspace, spaces, pages, and captures
        // and update PDF references in captures
        let newWorkspace = { ...importedData };
        // Assign a new unique ID for the workspace itself to prevent conflicts
        newWorkspace.id = Date.now() + Math.random(); 
        newWorkspace.name = `${importedData.name} (Imported)`; // Rename imported workspace
        
        // Use the newly prepared PDF metadata
        newWorkspace.pdfDocuments = newPdfDocumentsMetadata;

        // Recursively update IDs for spaces, pages, and captures
        const generateNewId = () => Date.now() + Math.random();
        newWorkspace.spaces = newWorkspace.spaces.map(space => ({
            ...space,
            id: generateNewId(),
            pages: space.pages.map(page => ({
                ...page,
                id: generateNewId(),
                captures: page.captures.map(capture => ({
                    ...capture,
                    id: generateNewId(),
                    // Update sourcePdfId if it was remapped during PDF binary import
                    sourcePdfId: oldToNewPdfIdMap.has(capture.sourcePdfId) ? oldToNewPdfIdMap.get(capture.sourcePdfId) : capture.sourcePdfId
                }))
            }))
        }));

        // If the imported workspace had an active space, find its new ID based on remapping
        if (importedData.activeSpaceId) {
            // Find the old space in the original importedData
            const oldSpace = importedData.spaces.find(s => s.id === importedData.activeSpaceId);
            if (oldSpace) {
                // Find the new space corresponding to the old one (assuming order is preserved after map)
                const newCorrespondingSpace = newWorkspace.spaces.find(s => s.name === oldSpace.name && s.created === oldSpace.created); // Crude match, better to use an ID map
                if (newCorrespondingSpace) {
                    newWorkspace.activeSpaceId = newCorrespondingSpace.id;
                } else {
                    newWorkspace.activeSpaceId = null; // Couldn't find, reset
                }
            } else {
                newWorkspace.activeSpaceId = null;
            }
        }


        // Save the new workspace
        await db.saveWorkspace(newWorkspace);
        setWorkspaces(prev => [...prev, newWorkspace]);
        setActiveWorkspaceId(newWorkspace.id); // Set the newly imported workspace as active
        showNotification(`Workspace "${newWorkspace.name}" imported successfully!`, 'success');

      } catch (error) {
        console.error('Error importing workspace:', error);
        showNotification(`Failed to import workspace: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="cyber-grid"></div>

      <WorkspacesPanel
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSetActive={handleSetActiveWorkspace}
        onCreate={() => setIsWorkspaceModalOpen(true)}
        onDelete={handleDeleteWorkspace}
        onRename={handleRenameWorkspace}
        isZenMode={isZenMode}
        onExport={handleExportWorkspace}
        onImport={() => document.getElementById('importWorkspaceInput').click()}
      />

      <div className="container">
        <Header
          onLoadClick={() => activeWorkspaceId && document.getElementById('fileInput').click()}
          onCreateSpace={() => activeWorkspaceId && setIsSpaceModalOpen(true)}
          onCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
          onClearAll={clearAll}
          isZenMode={isZenMode}
        />

        <div className="main-content">
          <div
            className={`pdf-viewers ${isSinglePdfZenMode ? 'single-pdf-zen-mode' : ''}`}
            id="pdfViewers"
            style={{ '--pdf-count': pdfsToRender.length || 1 }}
          >
            {pdfsToRender.length > 0 ? (
              pdfsToRender.map((doc, index) => (
                <PdfViewer
                  key={doc.id}
                  pdfData={doc}
                  index={index}
                  onRemove={removePDF}
                  onPageChange={updatePdfPage}
                  onCapture={handleCapture}
                  onUpscale={handleUpscale}
                  isUpscaling={upscalingPdfId === doc.id}
                  onZoomCapture={handleZoomCapture}
                  isZenMode={isZenMode}
                  isSinglePdfZenMode={isSinglePdfZenMode}
                />
              ))
            ) : (
              <div className="empty-state">
                <h3>🌌 READY FOR DIGITAL EXPLORATION</h3>
                <p>{activeWorkspace ? (isZenMode && isSinglePdfZenMode ? 'Load PDFs to view in single mode.' : 'Load your PDFs to begin.') : 'Create or select a workspace.'}</p>
              </div>
            )}
            {isZenMode && isSinglePdfZenMode && livePdfDocs.length > 1 && (
              <div className="pdf-number-indicator">
                {activeSinglePdfIndex + 1} / {livePdfDocs.length}
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

      {/* NEW: Hidden input for importing workspace file */}
      <input
        type="file"
        id="importWorkspaceInput"
        className="file-input"
        accept=".json"
        onChange={handleImportWorkspace}
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
          ✖️ Exit
        </button>,
        document.body
      )}

      {createPortal(
        <button
          className="zen-mode-toggle-button"
          onClick={() => {
            if (isZenMode) {
              // In Zen mode, toggle single/multi PDF view
              toggleSinglePdfZenMode();
            } else {
              // Not in Zen mode, activate Zen mode
              toggleZenMode();
            }
          }}
          title={isZenMode ? (isSinglePdfZenMode ? "Show all PDFs in Zen Mode" : "Show single PDF in Zen Mode") : "Enter Zen Mode (Esc to exit)"}
        >
          {isZenMode ? (isSinglePdfZenMode ? '📚 Multi-PDF' : '📄 Single') : 'Zen Mode'}
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
