import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Download, Zap, Settings, FileText, Layout, Palette, X } from 'lucide-react';
import CustomLayoutEditor from './CustomLayoutEditor';
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

interface ExportDialogProps {
  snippets: Snippet[];
  spaceName: string;
  onFastExport: () => void;
  onCustomExport: (layout: ExportLayout) => void;
  children: React.ReactNode;
}

export default function ExportDialog({ 
  snippets, 
  spaceName, 
  onFastExport, 
  onCustomExport, 
  children 
}: ExportDialogProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [exportMode, setExportMode] = useState<'selection' | 'custom'>('selection');

  const handleFastExport = () => {
    onFastExport();
    setShowDialog(false);
  };

  const handleCustomLayoutSave = (layout: ExportLayout) => {
    onCustomExport(layout);
    setShowDialog(false);
    setExportMode('selection');
  };

  const handleCustomLayoutCancel = () => {
    setExportMode('selection');
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setExportMode('selection');
  };

  // Full Screen Custom Layout Editor
  if (exportMode === 'custom') {
    return (
      <>
        {/* Full Screen Overlay with Blurred Background */}
        <div className="fixed inset-0 z-[100] flex">
          {/* Blurred Background */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
            style={{
              backdropFilter: 'blur(8px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(8px) saturate(1.2)'
            }}
          />
          
          {/* Full Screen Editor Container */}
          <div className="relative w-full h-full bg-gradient-to-br from-gray-900/95 via-purple-900/95 to-black/95 border border-cyan-500/20">
            {/* Header Bar */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gray-900/90 backdrop-blur-sm border-b border-cyan-500/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Layout className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      Custom Layout Editor
                    </h2>
                    <p className="text-sm text-gray-400">
                      {spaceName} • {snippets.length} snippets
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCustomLayoutCancel}
                  className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="pt-20 h-full">
              <CustomLayoutEditor
                snippets={snippets}
                onSave={handleCustomLayoutSave}
                onCancel={handleCustomLayoutCancel}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Regular Export Selection Dialog
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-gray-900 border-cyan-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Export PDF - {spaceName}
          </DialogTitle>
          <p className="text-gray-400 text-sm">
            Choose how you want to export your {snippets.length} snippets
          </p>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          {/* Fast Export Option */}
          <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 hover:border-green-400/50 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-300">Fast Export</h3>
                    <p className="text-sm text-gray-400">Quick export with automatic layout</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                    Recommended
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Automatic optimal layout</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Standard A4 portrait format</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Instant generation (2-3 seconds)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Perfect for quick reviews and sharing</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleFastExport}
                className="bg-green-500/20 hover:bg-green-500/30 border-green-400/50 text-green-300 group-hover:scale-105 transition-transform"
              >
                <Zap className="w-4 h-4 mr-2" />
                Export Now
              </Button>
            </div>
          </Card>

          {/* Custom Layout Option */}
          <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-400/50 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Settings className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-purple-300">Custom Layout</h3>
                    <p className="text-sm text-gray-400">Full control over positioning and styling</p>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50">
                    Advanced
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Drag and resize snippets freely</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Choose page size and orientation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Multi-page layout support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Perfect for presentations and reports</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  setExportMode('custom');
                  setShowDialog(false);
                }}
                className="bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/50 text-purple-300 group-hover:scale-105 transition-transform"
              >
                <Palette className="w-4 h-4 mr-2" />
                Customize
              </Button>
            </div>
          </Card>

          {/* Export Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>{snippets.length} snippets</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>•</span>
                <span>Space: {spaceName}</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleCloseDialog}
              className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}