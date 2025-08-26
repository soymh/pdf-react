import React, { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu';
import { FileText, Move, Trash2, Sparkles, Download, Copy } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import UpscalingDialog from './UpscalingDialog';
import { toast } from 'sonner@2.0.3';

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

interface SnippetGridProps {
  snippets: Snippet[];
  onUpdateSnippet?: (snippetId: string, updatedSnippet: Snippet) => void;
  onDeleteSnippet?: (snippetId: string) => void;
}

export default function SnippetGrid({ 
  snippets, 
  onUpdateSnippet, 
  onDeleteSnippet 
}: SnippetGridProps) {
  const [showUpscaling, setShowUpscaling] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [draggedSnippet, setDraggedSnippet] = useState<string | null>(null);

  const handleUpscaleSnippet = (snippet: Snippet) => {
    setSelectedSnippet(snippet);
    setShowUpscaling(true);
  };

  const handleUpscaleComplete = (upscaledImageURL: string) => {
    if (!selectedSnippet || !onUpdateSnippet) return;

    const updatedSnippet: Snippet = {
      ...selectedSnippet,
      imageUrl: upscaledImageURL
    };

    onUpdateSnippet(selectedSnippet.id, updatedSnippet);
    toast.success('Snippet upscaled successfully!');
  };

  const handleDownloadSnippet = (snippet: Snippet) => {
    // Create a download link for the snippet image
    const link = document.createElement('a');
    link.href = snippet.imageUrl;
    link.download = `snippet_${snippet.id}_page${snippet.pageNumber}.png`;
    link.click();
    toast.success('Snippet downloaded!');
  };

  const handleCopySnippet = async (snippet: Snippet) => {
    try {
      // Convert data URL to blob
      const response = await fetch(snippet.imageUrl);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      toast.success('Snippet copied to clipboard!');
    } catch (error) {
      // Fallback: copy the data URL as text
      try {
        await navigator.clipboard.writeText(snippet.imageUrl);
        toast.success('Snippet data copied to clipboard!');
      } catch (fallbackError) {
        toast.error('Failed to copy snippet');
      }
    }
  };

  const handleDeleteSnippet = (snippet: Snippet) => {
    if (onDeleteSnippet) {
      onDeleteSnippet(snippet.id);
      toast.success('Snippet deleted');
    }
  };

  const handleDragStart = (e: React.DragEvent, snippetId: string) => {
    setDraggedSnippet(snippetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedSnippet(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSnippetId: string) => {
    e.preventDefault();
    
    if (!draggedSnippet || draggedSnippet === targetSnippetId) return;
    
    // In a real implementation, you would handle reordering here
    toast.success('Snippet reordered (functionality would be implemented in full app)');
  };

  if (snippets.length === 0) {
    return (
      <Card className="p-12 text-center bg-gray-900/30 border-gray-700/50">
        <div className="text-6xl mb-4 opacity-20">📄</div>
        <p className="text-gray-400 text-lg mb-2">No snippets yet</p>
        <p className="text-gray-500 text-sm">
          Switch to the PDF Viewer and use Capture Mode to add snippets to this space.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {snippets.map((snippet) => (
          <ContextMenu key={snippet.id}>
            <ContextMenuTrigger>
              <Card 
                className={`group relative bg-gray-800/50 border-gray-700/50 hover:border-cyan-500/50 transition-all duration-200 cursor-move ${
                  draggedSnippet === snippet.id ? 'opacity-50 scale-95' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, snippet.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, snippet.id)}
              >
                {/* Snippet Image */}
                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                  <ImageWithFallback
                    src={snippet.imageUrl}
                    alt={`Snippet ${snippet.id}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-black/60 hover:bg-black/80 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSnippet(snippet);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-black/60 hover:bg-black/80 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySnippet(snippet);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Snippet Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/50">
                      <FileText className="w-3 h-3 mr-1" />
                      Page {snippet.pageNumber}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                        {Math.round(snippet.width)}×{Math.round(snippet.height)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    Position: ({Math.round(snippet.x)}, {Math.round(snippet.y)})
                  </div>
                  
                  {/* Drag Indicator */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-black/60 rounded p-1">
                      <Move className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </Card>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-gray-800 border-gray-700">
              <ContextMenuItem 
                onClick={() => handleUpscaleSnippet(snippet)}
                className="text-cyan-400 hover:bg-cyan-500/20 focus:bg-cyan-500/20"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Upscale with AI
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => handleDownloadSnippet(snippet)}
                className="text-green-400 hover:bg-green-500/20 focus:bg-green-500/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Image
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => handleCopySnippet(snippet)}
                className="text-blue-400 hover:bg-blue-500/20 focus:bg-blue-500/20"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </ContextMenuItem>
              {onDeleteSnippet && (
                <ContextMenuItem 
                  onClick={() => handleDeleteSnippet(snippet)}
                  className="text-red-400 hover:bg-red-500/20 focus:bg-red-500/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Snippet
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      {/* Upscaling Dialog */}
      <UpscalingDialog
        open={showUpscaling}
        onOpenChange={setShowUpscaling}
        imageSource={selectedSnippet?.imageUrl || null}
        onUpscaleComplete={handleUpscaleComplete}
        title={selectedSnippet ? `Upscale Snippet from Page ${selectedSnippet.pageNumber}` : 'Upscale Snippet'}
      />
    </>
  );
}