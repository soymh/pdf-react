import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Move, 
  Square, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import UpscalingDialog from './UpscalingDialog';
// PDF.js imports
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set the worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Snippet {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pdfId: string;
  pageNumber: number;
}

interface Snippet {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pdfId: string;
  pageNumber: number;
}

interface PDFViewerProps {
  pdfId: string;
  pdfName: string;
  pdfFile?: File;
  onSnippetCapture: (snippet: Snippet) => void;
}

export default function PDFViewer({ pdfId, pdfName, pdfFile, onSnippetCapture }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selection, setSelection] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    isSelecting: boolean;
  } | null>(null);
  const [pageImages, setPageImages] = useState<{ [key: number]: string }>({});
  const [showUpscaling, setShowUpscaling] = useState(false);
  const [upscalingSource, setUpscalingSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Load PDF when pdfFile changes
  useEffect(() => {
    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First try to load from the File object if available
        if (pdfFile) {
          // Read the file as ArrayBuffer
          const arrayBuffer = await pdfFile.arrayBuffer();
          
          // Load the PDF document directly from the ArrayBuffer
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          pdfRef.current = pdf;
          setTotalPages(pdf.numPages);
          return;
        }
        
        // If no file object, try to get from localStorage
        const cachedPDFs = localStorage.getItem('pdf_workspace_open_pdfs');
        if (!cachedPDFs) {
          throw new Error('No PDFs found in cache. Please re-upload the PDF.');
        }
        
        const openPDFs = JSON.parse(cachedPDFs);
        const currentPDF = openPDFs.find((pdf: any) => pdf.id === pdfId);
        if (!currentPDF) {
          throw new Error('PDF not found. Please re-upload the PDF.');
        }
        
        // For blob URLs, we need to fetch the data first
        if (currentPDF.url.startsWith('blob:')) {
          try {
            const response = await fetch(currentPDF.url);
            if (!response.ok) {
              throw new Error('Failed to fetch PDF data from blob URL. The PDF session may have expired.');
            }
            const arrayBuffer = await response.arrayBuffer();
            
            // Load the PDF document from the ArrayBuffer
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            pdfRef.current = pdf;
            setTotalPages(pdf.numPages);
          } catch (fetchError) {
            // If fetching the blob fails, suggest re-uploading
            throw new Error('The PDF session has expired. Please re-upload the PDF.');
          }
        } else {
          // For regular URLs, load directly
          const loadingTask = pdfjsLib.getDocument(currentPDF.url);
          const pdf = await loadingTask.promise;
          pdfRef.current = pdf;
          setTotalPages(pdf.numPages);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        toast.error('Failed to load PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [pdfFile, pdfId]);

  

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCapturing || !canvasRef.current || !pdfRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setSelection({
      start: { x, y },
      end: { x, y },
      isSelecting: true
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selection?.isSelecting || !canvasRef.current || !pdfRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setSelection(prev => prev ? {
      ...prev,
      end: { x, y }
    } : null);
  };

  const handleMouseUp = () => {
    if (!selection?.isSelecting || !pdfRef.current) return;
    
    setSelection(prev => prev ? {
      ...prev,
      isSelecting: false
    } : null);
  };

  const captureSelection = () => {
    if (!selection || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast.error('Could not get canvas context for capture');
      return;
    }
    
    const x = Math.min(selection.start.x, selection.end.x);
    const y = Math.min(selection.start.y, selection.end.y);
    const width = Math.abs(selection.end.x - selection.start.x);
    const height = Math.abs(selection.end.y - selection.start.y);
    
    if (width < 10 || height < 10) {
      toast.error('Selection too small. Please select a larger area.');
      return;
    }
    
    // Create a new canvas for the snippet
    const snippetCanvas = document.createElement('canvas');
    snippetCanvas.width = width;
    snippetCanvas.height = height;
    const snippetCtx = snippetCanvas.getContext('2d');
    
    if (!snippetCtx) {
      toast.error('Could not get snippet canvas context');
      return;
    }
    
    // Draw the selected area
    snippetCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    
    const snippet: Snippet = {
      id: `snippet_${Date.now()}_${Math.random()}`,
      imageUrl: snippetCanvas.toDataURL(),
      x,
      y,
      width,
      height,
      pdfId,
      pageNumber: currentPage
    };
    
    onSnippetCapture(snippet);
    setSelection(null);
    setIsCapturing(false);
  };

  const handleUpscalePage = async () => {
    if (!canvasRef.current) {
      toast.error('No page image available for upscaling');
      return;
    }

    // Get the current canvas content as data URL
    const currentPageImage = canvasRef.current.toDataURL();
    setUpscalingSource(currentPageImage);
    setShowUpscaling(true);
  };

  const handleUpscaleComplete = (upscaledImageURL: string) => {
    // Display the upscaled image on the canvas
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        toast.error('Could not get canvas context for upscaling');
        return;
      }
      
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      
      img.onerror = () => {
        toast.error('Failed to load upscaled image');
      };
      
      img.src = upscaledImageURL;
    }
    
    toast.success(`Page ${currentPage} has been upscaled!`);
  };

  // Render the current page when it changes
  useEffect(() => {
    if (!pdfRef.current) return;
    
    const renderCurrentPage = async () => {
      try {
        setIsLoading(true);
        const page = await pdfRef.current.getPage(currentPage);
        
        // Set viewport based on zoom level
        const viewport = page.getViewport({ scale: zoom * 1.5 });
        
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (!context) {
            throw new Error('Could not get canvas context');
          }
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          // Render the page
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          
          await page.render(renderContext).promise;
        }
      } catch (err) {
        console.error('Error rendering page:', err);
        setError(err instanceof Error ? err.message : 'Failed to render page');
        toast.error(`Failed to render page ${currentPage}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    renderCurrentPage();
  }, [currentPage, zoom, pdfRef.current]);

  // Navigation functions
  const goToPreviousPage = () => {
    if (currentPage <= 1) return;
    setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage >= totalPages) return;
    setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => {
    setZoom(Math.min(3, zoom + 0.25));
  };

  const zoomOut = () => {
    setZoom(Math.max(0.5, zoom - 0.25));
  };

  return (
    <div className="space-y-4">
      {/* PDF Controls */}
      <Card className="p-4 bg-gray-900/50 border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={goToPreviousPage}
                disabled={currentPage === 1 || isLoading}
                className="border-cyan-400/50 text-cyan-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">Page</span>
                <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-400/50">
                  {currentPage} / {totalPages}
                </Badge>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={goToNextPage}
                disabled={currentPage === totalPages || isLoading}
                className="border-cyan-400/50 text-cyan-300"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="h-4 w-px bg-gray-600"></div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={zoomOut}
                disabled={isLoading}
                className="border-purple-400/50 text-purple-300"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <span className="text-sm text-gray-300 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              
              <Button
                size="sm"
                variant="outline"
                onClick={zoomIn}
                disabled={isLoading}
                className="border-purple-400/50 text-purple-300"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={isCapturing ? "default" : "outline"}
              onClick={() => {
                setIsCapturing(!isCapturing);
                setSelection(null);
              }}
              disabled={isLoading}
              className={isCapturing 
                ? "bg-green-500/30 border-green-400/50 text-green-300" 
                : "border-yellow-400/50 text-yellow-300"
              }
            >
              <Square className="w-4 h-4 mr-2" />
              {isCapturing ? 'Capturing...' : 'Capture Mode'}
            </Button>
            
            {selection && !selection.isSelecting && (
              <Button
                size="sm"
                onClick={captureSelection}
                className="bg-green-500/20 hover:bg-green-500/30 border-green-400/50 text-green-300"
              >
                Save Snippet
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* PDF Canvas */}
      <Card className="bg-gray-900/30 border-gray-700/50 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/50">
            <div className="text-cyan-400">Loading PDF...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/50">
            <div className="text-red-400 text-center p-4 max-w-md">
              <p className="mb-4">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-red-500/20 hover:bg-red-500/30 border-red-400/50 text-red-300 mr-2"
              >
                Reload
              </Button>
              <Button 
                onClick={() => document.getElementById('pdf-upload-trigger')?.click()} 
                className="bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/50 text-blue-300"
              >
                Upload PDF
              </Button>
            </div>
          </div>
        )}
        <div 
          ref={containerRef}
          className="relative overflow-auto max-h-[70vh] bg-gray-800/50"
          style={{ cursor: isCapturing ? 'crosshair' : 'default' }}
        >
          <ContextMenu>
            <ContextMenuTrigger>
              <div className="p-4 flex justify-center">
                <div 
                  className="relative"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                  <canvas
                    ref={canvasRef}
                    className="border border-gray-600 shadow-lg bg-white"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  />
                  
                  {/* Selection overlay */}
                  {selection && (
                    <div
                      className="absolute border-2 border-cyan-400 bg-cyan-400/10 pointer-events-none"
                      style={{
                        left: Math.min(selection.start.x, selection.end.x),
                        top: Math.min(selection.start.y, selection.end.y),
                        width: Math.abs(selection.end.x - selection.start.x),
                        height: Math.abs(selection.end.y - selection.start.y),
                      }}
                    />
                  )}
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-gray-800 border-gray-700">
              <ContextMenuItem 
                onClick={handleUpscalePage}
                className="text-cyan-400 hover:bg-cyan-500/20 focus:bg-cyan-500/20"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Upscale Page with AI
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </Card>

      {/* Capture Instructions */}
      {isCapturing && (
        <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-center space-x-2 text-yellow-300">
            <Square className="w-4 h-4" />
            <span className="text-sm font-medium">Capture Mode Active</span>
          </div>
          <p className="text-yellow-200/80 text-sm mt-2">
            Click and drag to select an area on the PDF page. The selected region will be saved as a snippet.
          </p>
        </Card>
      )}

      {/* Upscaling Dialog */}
      <UpscalingDialog
        open={showUpscaling}
        onOpenChange={setShowUpscaling}
        imageSource={upscalingSource}
        onUpscaleComplete={handleUpscaleComplete}
        title={`Upscale Page ${currentPage} - ${pdfName}`}
      />
    </div>
  );
}