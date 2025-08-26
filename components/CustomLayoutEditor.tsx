import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Slider } from './ui/slider';
import { 
  Download, 
  Plus, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeft,
  Trash2,
  Copy,
  Grid,
  Maximize2,
  Minimize2,
  Move,
  Menu,
  Settings,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Layers
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { ExportLayout } from '../App';

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

interface LayoutSnippet {
  id: string;
  originalSnippet: Snippet;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  rotation: number;
  zIndex: number;
}

interface CustomLayoutEditorProps {
  snippets: Snippet[];
  onSave: (layout: ExportLayout) => void;
  onCancel: () => void;
}

// Standard page dimensions in points (1 inch = 72 points)
const PAGE_SIZES = {
  A4: { width: 595, height: 842, label: 'A4 (210 × 297 mm)' },
  Letter: { width: 612, height: 792, label: 'Letter (8.5 × 11 in)' },
  Legal: { width: 612, height: 1008, label: 'Legal (8.5 × 14 in)' },
  A3: { width: 842, height: 1191, label: 'A3 (297 × 420 mm)' }
};

export default function CustomLayoutEditor({ snippets, onSave, onCancel }: CustomLayoutEditorProps) {
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [zoom, setZoom] = useState(0.7);
  const [currentPage, setCurrentPage] = useState(0);
  const [layoutSnippets, setLayoutSnippets] = useState<LayoutSnippet[]>([]);
  const [selectedSnippet, setSelectedSnippet] = useState<string | null>(null);
  const [draggedSnippet, setDraggedSnippet] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setZoom(0.5);
      } else {
        setZoom(0.7);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize layout snippets on first render
  useEffect(() => {
    if (layoutSnippets.length === 0 && snippets.length > 0) {
      const initialLayout = snippets.map((snippet, index) => ({
        id: snippet.id,
        originalSnippet: snippet,
        x: 50 + (index % 3) * 180, // Allow 3 columns
        y: 50 + Math.floor(index / 3) * 150,
        width: Math.min(160, snippet.width),
        height: Math.min(110, snippet.height),
        pageIndex: 0,
        rotation: 0,
        zIndex: index + 1
      }));
      setLayoutSnippets(initialLayout);
    }
  }, [snippets, layoutSnippets.length]);

  const getPageDimensions = () => {
    const size = PAGE_SIZES[pageSize];
    return orientation === 'portrait' 
      ? { width: size.width, height: size.height }
      : { width: size.height, height: size.width };
  };

  const getCanvasSize = () => {
    const { width, height } = getPageDimensions();
    return {
      width: width * zoom,
      height: height * zoom
    };
  };

  const getCurrentPageSnippets = () => {
    return layoutSnippets
      .filter(snippet => snippet.pageIndex === currentPage)
      .sort((a, b) => a.zIndex - b.zIndex); // Sort by z-index for proper layering
  };

  const getMaxZIndex = () => {
    const pageSnippets = getCurrentPageSnippets();
    return pageSnippets.length > 0 ? Math.max(...pageSnippets.map(s => s.zIndex)) : 0;
  };

  const addNewPage = () => {
    const newPageIndex = getTotalPages();
    setCurrentPage(newPageIndex);
    
    // Add any off-canvas snippets to the new page
    const { width, height } = getPageDimensions();
    const offCanvasSnippets = layoutSnippets.filter(
      snippet => snippet.pageIndex === currentPage && 
      (snippet.x + snippet.width > width || snippet.y + snippet.height > height)
    );
    
    if (offCanvasSnippets.length > 0) {
      setLayoutSnippets(prev => prev.map(snippet => 
        offCanvasSnippets.includes(snippet)
          ? { ...snippet, pageIndex: newPageIndex, x: 50, y: 50 }
          : snippet
      ));
    }
  };

  const getTotalPages = () => {
    return Math.max(1, ...layoutSnippets.map(s => s.pageIndex + 1));
  };

  const snapToGridValue = (value: number, gridSize = 10) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const handleSnippetMouseDown = (e: React.MouseEvent, snippetId: string) => {
    e.preventDefault();
    setSelectedSnippet(snippetId);
    setDraggedSnippet(snippetId);
    setIsDragging(true);
    
    // Bring to front when selected
    bringToFront(snippetId);
  };

  const handleSnippetTouchStart = (e: React.TouchEvent, snippetId: string) => {
    e.preventDefault();
    setSelectedSnippet(snippetId);
    setDraggedSnippet(snippetId);
    setIsDragging(true);
    bringToFront(snippetId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !draggedSnippet || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setLayoutSnippets(prev => prev.map(snippet =>
      snippet.id === draggedSnippet
        ? { 
            ...snippet, 
            x: snapToGridValue(Math.max(0, x - snippet.width / 2)), 
            y: snapToGridValue(Math.max(0, y - snippet.height / 2)) 
          }
        : snippet
    ));
  }, [isDragging, draggedSnippet, zoom, snapToGrid]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !draggedSnippet || !canvasRef.current) return;
    
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / zoom;
    const y = (touch.clientY - rect.top) / zoom;

    setLayoutSnippets(prev => prev.map(snippet =>
      snippet.id === draggedSnippet
        ? { 
            ...snippet, 
            x: snapToGridValue(Math.max(0, x - snippet.width / 2)), 
            y: snapToGridValue(Math.max(0, y - snippet.height / 2)) 
          }
        : snippet
    ));
  }, [isDragging, draggedSnippet, zoom, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedSnippet(null);
  }, []);

  const resizeSnippet = (snippetId: string, deltaWidth: number, deltaHeight: number) => {
    setLayoutSnippets(prev => prev.map(snippet =>
      snippet.id === snippetId
        ? { 
            ...snippet, 
            width: Math.max(50, snippet.width + deltaWidth),
            height: Math.max(50, snippet.height + deltaHeight)
          }
        : snippet
    ));
  };

  const rotateSnippet = (snippetId: string, degrees: number) => {
    setLayoutSnippets(prev => prev.map(snippet =>
      snippet.id === snippetId
        ? { ...snippet, rotation: (snippet.rotation + degrees) % 360 }
        : snippet
    ));
  };

  const bringToFront = (snippetId: string) => {
    const maxZ = getMaxZIndex();
    setLayoutSnippets(prev => prev.map(snippet =>
      snippet.id === snippetId && snippet.pageIndex === currentPage
        ? { ...snippet, zIndex: maxZ + 1 }
        : snippet
    ));
  };

  const sendToBack = (snippetId: string) => {
    const pageSnippets = getCurrentPageSnippets();
    const minZ = pageSnippets.length > 0 ? Math.min(...pageSnippets.map(s => s.zIndex)) : 1;
    
    // Shift all other snippets up by 1
    setLayoutSnippets(prev => prev.map(snippet => {
      if (snippet.pageIndex === currentPage && snippet.id !== snippetId) {
        return { ...snippet, zIndex: snippet.zIndex + 1 };
      } else if (snippet.id === snippetId) {
        return { ...snippet, zIndex: minZ - 1 };
      }
      return snippet;
    }));
  };

  const deleteSnippet = (snippetId: string) => {
    setLayoutSnippets(prev => prev.filter(snippet => snippet.id !== snippetId));
    setSelectedSnippet(null);
  };

  const duplicateSnippet = (snippetId: string) => {
    const snippet = layoutSnippets.find(s => s.id === snippetId);
    if (snippet) {
      const newSnippet: LayoutSnippet = {
        ...snippet,
        id: `${snippet.id}_copy_${Date.now()}`,
        x: snapToGridValue(snippet.x + 20),
        y: snapToGridValue(snippet.y + 20),
        zIndex: getMaxZIndex() + 1
      };
      setLayoutSnippets(prev => [...prev, newSnippet]);
    }
  };

  const moveSnippetToPage = (snippetId: string, targetPage: number) => {
    setLayoutSnippets(prev => prev.map(snippet =>
      snippet.id === snippetId
        ? { ...snippet, pageIndex: targetPage, x: 50, y: 50 }
        : snippet
    ));
  };

  const handleSave = () => {
    const layout: ExportLayout = {
      pageSize,
      orientation,
      snippets: layoutSnippets.map(snippet => ({
        id: snippet.originalSnippet.id,
        x: snippet.x,
        y: snippet.y,
        width: snippet.width,
        height: snippet.height,
        pageIndex: snippet.pageIndex,
        rotation: snippet.rotation,
        zIndex: snippet.zIndex
      }))
    };
    onSave(layout);
  };

  const resetView = () => {
    setZoom(isMobile ? 0.5 : 0.7);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;
    }
  };

  const fitToView = () => {
    if (containerRef.current && canvasRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const { width, height } = getPageDimensions();
      
      const scaleX = (containerWidth - (isMobile ? 32 : 100)) / width;
      const scaleY = (containerHeight - (isMobile ? 32 : 100)) / height;
      const newZoom = Math.min(scaleX, scaleY, 1.2);
      
      setZoom(Math.max(0.2, newZoom));
    }
  };

  const selectedSnippetData = selectedSnippet ? layoutSnippets.find(s => s.id === selectedSnippet) : null;
  const canvasSize = getCanvasSize();
  const pageDimensions = getPageDimensions();

  // Sidebar Content Component
  const SidebarContent = () => (
    <div className="space-y-4 md:space-y-6 p-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-700/30">
        <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Layout Editor
        </h2>
        <p className="text-xs md:text-sm text-gray-400 mt-1">Advanced snippet arrangement</p>
      </div>

      {/* Page Settings */}
      <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700/50">
        <h3 className="text-sm md:text-base font-semibold text-purple-300 mb-3 flex items-center">
          <Maximize2 className="w-4 h-4 mr-2" />
          Page Settings
        </h3>
        
        <div className="space-y-3 md:space-y-4">
          <div>
            <label className="text-xs md:text-sm text-gray-400 mb-2 block">Page Size</label>
            <Select value={pageSize} onValueChange={(value: keyof typeof PAGE_SIZES) => setPageSize(value)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 h-8 md:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {Object.entries(PAGE_SIZES).map(([key, size]) => (
                  <SelectItem key={key} value={key} className="text-white">
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs md:text-sm text-gray-400 mb-2 block">Orientation</label>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={orientation === 'portrait' ? 'default' : 'outline'}
                onClick={() => setOrientation('portrait')}
                className="flex-1 h-8 text-xs md:text-sm"
              >
                Portrait
              </Button>
              <Button
                size="sm"
                variant={orientation === 'landscape' ? 'default' : 'outline'}
                onClick={() => setOrientation('landscape')}
                className="flex-1 h-8 text-xs md:text-sm"
              >
                Landscape
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* View Controls */}
      <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700/50">
        <h3 className="text-sm md:text-base font-semibold text-cyan-300 mb-3 flex items-center">
          <Move className="w-4 h-4 mr-2" />
          View Controls
        </h3>
        
        <div className="space-y-3 md:space-y-4">
          <div>
            <label className="text-xs md:text-sm text-gray-400 mb-2 block">Zoom Level</label>
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
                className="p-2 h-8"
              >
                <ZoomOut className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <span className="text-xs md:text-sm text-gray-300 min-w-[3rem] md:min-w-[4rem] text-center bg-gray-800/50 px-2 py-1 rounded text-xs">
                {Math.round(zoom * 100)}%
              </span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-2 h-8"
              >
                <ZoomIn className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={resetView}
              className="text-xs h-8"
            >
              Reset View
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fitToView}
              className="text-xs h-8"
            >
              Fit to View
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs md:text-sm text-gray-400">Grid</label>
              <Button
                size="sm"
                variant={showGrid ? 'default' : 'outline'}
                onClick={() => setShowGrid(!showGrid)}
                className="w-12 h-8 text-xs"
              >
                {showGrid ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs md:text-sm text-gray-400">Snap to Grid</label>
              <Button
                size="sm"
                variant={snapToGrid ? 'default' : 'outline'}
                onClick={() => setSnapToGrid(!snapToGrid)}
                className="w-12 h-8 text-xs"
              >
                {snapToGrid ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Page Navigation */}
      <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm md:text-base font-semibold text-orange-300 flex items-center">
            <Grid className="w-4 h-4 mr-2" />
            Pages
          </h3>
          <Button size="sm" variant="outline" onClick={addNewPage} className="p-1 h-8">
            <Plus className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>
        
        <ScrollArea className="h-32 md:h-40">
          <div className="space-y-2 pr-2">
            {Array.from({ length: getTotalPages() }, (_, index) => (
              <Button
                key={index}
                size="sm"
                variant={currentPage === index ? 'default' : 'outline'}
                onClick={() => setCurrentPage(index)}
                className="w-full justify-between h-8 text-xs md:text-sm"
              >
                <span>Page {index + 1}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {layoutSnippets.filter(s => s.pageIndex === index).length}
                </Badge>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Selected Snippet Controls */}
      {selectedSnippetData && (
        <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700/50">
          <h3 className="text-sm md:text-base font-semibold text-yellow-300 mb-3 flex items-center">
            <Layers className="w-4 h-4 mr-2" />
            Selected Snippet
          </h3>
          <div className="space-y-4">
            {/* Size Controls */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Size</label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => resizeSnippet(selectedSnippet!, -20, -15)}
                  className="text-xs h-8"
                >
                  Smaller
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => resizeSnippet(selectedSnippet!, 20, 15)}
                  className="text-xs h-8"
                >
                  Larger
                </Button>
              </div>
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Rotation: {selectedSnippetData.rotation}°</label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => rotateSnippet(selectedSnippet!, -90)}
                  className="text-xs h-8"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => rotateSnippet(selectedSnippet!, 90)}
                  className="text-xs h-8"
                >
                  <RotateCw className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setLayoutSnippets(prev => prev.map(s => 
                    s.id === selectedSnippet ? { ...s, rotation: 0 } : s
                  ))}
                  className="text-xs h-8"
                >
                  Reset
                </Button>
              </div>
              <Slider
                value={[selectedSnippetData.rotation]}
                onValueChange={([value]) => setLayoutSnippets(prev => prev.map(s => 
                  s.id === selectedSnippet ? { ...s, rotation: value } : s
                ))}
                max={360}
                min={0}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Layer Controls */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Layer Order</label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => bringToFront(selectedSnippet!)}
                  className="text-xs h-8"
                >
                  <ArrowUp className="w-3 h-3 mr-1" />
                  Front
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => sendToBack(selectedSnippet!)}
                  className="text-xs h-8"
                >
                  <ArrowDown className="w-3 h-3 mr-1" />
                  Back
                </Button>
              </div>
            </div>

            {/* Action Controls */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => duplicateSnippet(selectedSnippet!)}
                className="text-xs h-8"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => deleteSnippet(selectedSnippet!)}
                className="text-xs h-8"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <Card className="p-3 md:p-4 bg-gray-800/50 border-gray-700/50 mt-auto">
        <div className="space-y-3">
          <Button 
            onClick={handleSave} 
            className="w-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border-green-400/50 text-green-300 h-9"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel} 
            className="w-full border-gray-600 text-gray-300 h-9"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Options
          </Button>
        </div>
      </Card>
    </div>
  );

  // Fit to view on initial load
  useEffect(() => {
    setTimeout(() => fitToView(), 100);
  }, []);

  return (
    <div className="flex h-full">
      {/* Mobile Sidebar (Sheet) */}
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="fixed top-20 left-4 z-50 lg:hidden bg-gray-900/80 backdrop-blur-sm border-gray-700"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 bg-gray-900 border-gray-700 overflow-y-auto">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop Sidebar */
        <div className="w-80 border-r border-gray-700/50 bg-gray-900/50 overflow-y-auto">
          <SidebarContent />
        </div>
      )}

      {/* Canvas Area - Full Screen Optimized */}
      <div 
        ref={containerRef}
        className="flex-1 bg-gradient-to-br from-gray-900/50 to-gray-800/50 overflow-auto relative"
      >
        <div className="p-2 md:p-6 min-h-full flex items-center justify-center">
          <div className="relative">
            {/* Mobile Page Info (Compact) */}
            {isMobile && (
              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded z-10">
                <div>Page {currentPage + 1}/{getTotalPages()} • {getCurrentPageSnippets().length} items</div>
              </div>
            )}

            {/* Desktop Page Info Panel */}
            {!isMobile && (
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg z-10 flex items-center space-x-3">
                <div className="flex items-center">
                  <span className="text-cyan-300 mr-2">Page:</span>
                  <span>{currentPage + 1} of {getTotalPages()}</span>
                </div>
                <div className="h-4 w-px bg-gray-600"></div>
                <div className="flex items-center">
                  <span className="text-purple-300 mr-2">Size:</span>
                  <span>{pageDimensions.width} × {pageDimensions.height} pts</span>
                </div>
                <div className="h-4 w-px bg-gray-600"></div>
                <div className="flex items-center">
                  <span className="text-orange-300 mr-2">Snippets:</span>
                  <span>{getCurrentPageSnippets().length}</span>
                </div>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-black/70 backdrop-blur-sm rounded-lg p-1 z-10 flex flex-col space-y-1">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
                className="p-1 h-6 w-6 md:h-8 md:w-8"
              >
                <ZoomOut className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <div className="text-xs text-center text-gray-300 px-1">
                {Math.round(zoom * 100)}%
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-1 h-6 w-6 md:h-8 md:w-8"
              >
                <ZoomIn className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={fitToView}
                className="p-1 h-6 w-6 md:h-8 md:w-8"
              >
                <Minimize2 className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>

            {/* Canvas */}
            <div
              ref={canvasRef}
              className="relative bg-white border-2 border-gray-600/50 shadow-2xl rounded-sm"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                minWidth: isMobile ? '320px' : '400px'
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              {/* Grid Background */}
              {showGrid && (
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #000 1px, transparent 1px),
                      linear-gradient(to bottom, #000 1px, transparent 1px)
                    `,
                    backgroundSize: `${20 * zoom}px ${20 * zoom}px`
                  }}
                />
              )}

              {/* Page Dimensions Indicator (Desktop Only) */}
              {!isMobile && (
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {pageDimensions.width} × {pageDimensions.height} pts ({orientation})
                </div>
              )}

              {/* Snippets - Rendered in z-index order */}
              {getCurrentPageSnippets().map((snippet) => (
                <div
                  key={snippet.id}
                  className={`absolute cursor-move border-2 transition-all duration-150 ${
                    selectedSnippet === snippet.id 
                      ? 'border-cyan-400 shadow-lg shadow-cyan-400/50' 
                      : 'border-gray-400/50 hover:border-purple-400/50'
                  }`}
                  style={{
                    left: snippet.x * zoom,
                    top: snippet.y * zoom,
                    width: snippet.width * zoom,
                    height: snippet.height * zoom,
                    minWidth: isMobile ? '40px' : '50px',
                    minHeight: isMobile ? '30px' : '40px',
                    zIndex: snippet.zIndex,
                    transform: `rotate(${snippet.rotation}deg)`,
                    transformOrigin: 'center'
                  }}
                  onMouseDown={(e) => handleSnippetMouseDown(e, snippet.id)}
                  onTouchStart={(e) => handleSnippetTouchStart(e, snippet.id)}
                >
                  <ImageWithFallback
                    src={snippet.originalSnippet.imageUrl}
                    alt={`Snippet ${snippet.id}`}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  
                  {/* Layer indicator */}
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                    {snippet.zIndex}
                  </div>
                  
                  {/* Resize Handles */}
                  {selectedSnippet === snippet.id && (
                    <>
                      {/* Corner handles */}
                      <div className={`absolute -bottom-1 -right-1 ${isMobile ? 'w-4 h-4' : 'w-3 h-3'} bg-cyan-400 border border-white cursor-se-resize`} />
                      <div className={`absolute -top-1 -left-1 ${isMobile ? 'w-4 h-4' : 'w-3 h-3'} bg-cyan-400 border border-white cursor-nw-resize`} />
                      <div className={`absolute -bottom-1 -left-1 ${isMobile ? 'w-4 h-4' : 'w-3 h-3'} bg-cyan-400 border border-white cursor-sw-resize`} />
                      <div className={`absolute -top-1 -right-1 ${isMobile ? 'w-4 h-4' : 'w-3 h-3'} bg-cyan-400 border border-white cursor-ne-resize`} />
                    </>
                  )}
                </div>
              ))}

              {/* Drop Zone Indicator */}
              {getCurrentPageSnippets().length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Grid className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} mx-auto mb-2 opacity-50`} />
                    <p className={`${isMobile ? 'text-sm' : ''} font-medium`}>No snippets on this page</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                      {isMobile ? 'Touch snippets to arrange' : 'Drag snippets here to arrange them'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}