import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { 
  FileText, 
  Zap, 
  Plus, 
  Download, 
  Grid3x3, 
  Folder, 
  X, 
  Move, 
  Trash2, 
  Upload,
  Save,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import PDFViewer from '../components/PDFViewer';
import WorkspaceManager from '../components/WorkspaceManager';
import ExportDialog from '../components/ExportDialog';
import { exportFastPDF, exportCustomPDF } from '../components/PDFExportUtils';
import { Toaster } from '../components/ui/sonner';

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

interface Space {
  id: string;
  name: string;
  snippets: Snippet[];
  workspaceId: string;
}

interface Workspace {
  id: string;
  name: string;
  spaces: Space[];
}

interface OpenPDF {
  id: string;
  name: string;
  url: string;
  file?: File; // Store actual file for real PDF functionality
}

export interface ExportLayout {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3';
  orientation: 'portrait' | 'landscape';
  snippets: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pageIndex: number;
    rotation?: number;
    zIndex?: number;
  }>;
}

// Cache keys for localStorage
const CACHE_KEYS = {
  WORKSPACES: 'pdf_workspace_workspaces',
  OPEN_PDFS: 'pdf_workspace_open_pdfs',
  SELECTED_WORKSPACE: 'pdf_workspace_selected_workspace',
  SELECTED_SPACE: 'pdf_workspace_selected_space',
  ACTIVE_PDF: 'pdf_workspace_active_pdf'
};

export default function App() {
  const [activeTab, setActiveTab] = useState('viewer');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [openPDFs, setOpenPDFs] = useState<OpenPDF[]>([]);
  const [activePDF, setActivePDF] = useState<string>('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [showWorkspaceImport, setShowWorkspaceImport] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    type: 'workspace' | 'space';
    id: string;
    name: string;
  }>({ show: false, type: 'workspace', id: '', name: '' });

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
  }, []);

  // Save data to cache whenever state changes
  useEffect(() => {
    saveCachedData();
  }, [workspaces, openPDFs, selectedWorkspace, selectedSpace, activePDF]);

  const loadCachedData = () => {
    try {
      // Load workspaces
      const cachedWorkspaces = localStorage.getItem(CACHE_KEYS.WORKSPACES);
      if (cachedWorkspaces) {
        const parsedWorkspaces = JSON.parse(cachedWorkspaces);
        setWorkspaces(parsedWorkspaces);
      } else {
        // Initialize with sample workspace if no cache
        const sampleWorkspace: Workspace = {
          id: 'ws1',
          name: 'Neural Research Project',
          spaces: [
            {
              id: 'sp1',
              name: 'Key Findings',
              snippets: [],
              workspaceId: 'ws1'
            }
          ]
        };
        setWorkspaces([sampleWorkspace]);
        setSelectedWorkspace('ws1');
        setSelectedSpace('sp1');
        return;
      }

      // Load open PDFs
      const cachedPDFs = localStorage.getItem(CACHE_KEYS.OPEN_PDFS);
      if (cachedPDFs) {
        const parsedPDFs = JSON.parse(cachedPDFs);
        setOpenPDFs(parsedPDFs);
      }

      // Load selections
      const cachedWorkspace = localStorage.getItem(CACHE_KEYS.SELECTED_WORKSPACE);
      const cachedSpace = localStorage.getItem(CACHE_KEYS.SELECTED_SPACE);
      const cachedActivePDF = localStorage.getItem(CACHE_KEYS.ACTIVE_PDF);

      if (cachedWorkspace) setSelectedWorkspace(cachedWorkspace);
      if (cachedSpace) setSelectedSpace(cachedSpace);
      if (cachedActivePDF) setActivePDF(cachedActivePDF);

      toast.success('Workspace data loaded from cache');
    } catch (error) {
      console.error('Error loading cached data:', error);
      toast.error('Failed to load cached data');
    }
  };

  const saveCachedData = () => {
    try {
      localStorage.setItem(CACHE_KEYS.WORKSPACES, JSON.stringify(workspaces));
      localStorage.setItem(CACHE_KEYS.OPEN_PDFS, JSON.stringify(openPDFs.map(pdf => ({
        id: pdf.id,
        name: pdf.name,
        url: pdf.url
        // Note: File objects can't be serialized, so we'll need to handle re-upload
      }))));
      
      if (selectedWorkspace) localStorage.setItem(CACHE_KEYS.SELECTED_WORKSPACE, selectedWorkspace);
      if (selectedSpace) localStorage.setItem(CACHE_KEYS.SELECTED_SPACE, selectedSpace);
      if (activePDF) localStorage.setItem(CACHE_KEYS.ACTIVE_PDF, activePDF);
    } catch (error) {
      console.error('Error saving cached data:', error);
    }
  };

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type === 'application/pdf') {
        const pdfId = `pdf_${Date.now()}_${Math.random()}`;
        const fileURL = URL.createObjectURL(file);
        
        const newPDF: OpenPDF = {
          id: pdfId,
          name: file.name,
          url: fileURL,
          file: file
        };

        setOpenPDFs(prev => [...prev, newPDF]);
        setActivePDF(pdfId);
        toast.success(`PDF "${file.name}" loaded successfully!`);
      } else {
        toast.error(`"${file.name}" is not a valid PDF file`);
      }
    }

    setShowPDFUpload(false);
    // Reset input
    event.target.value = '';
  };

  const closePDF = (pdfId: string) => {
    setOpenPDFs(prev => {
      const updated = prev.filter(pdf => pdf.id !== pdfId);
      
      // Clean up object URL to prevent memory leaks
      const pdfToClose = prev.find(pdf => pdf.id === pdfId);
      if (pdfToClose && pdfToClose.url.startsWith('blob:')) {
        URL.revokeObjectURL(pdfToClose.url);
      }

      // If closing active PDF, switch to another one
      if (activePDF === pdfId && updated.length > 0) {
        setActivePDF(updated[0].id);
      } else if (updated.length === 0) {
        setActivePDF('');
      }

      return updated;
    });
    
    toast.success('PDF closed');
  };

  const createWorkspace = (name: string) => {
    const newWorkspace: Workspace = {
      id: `ws_${Date.now()}`,
      name,
      spaces: []
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
    toast.success('Workspace Created Successfully!');
  };

  const createSpace = (workspaceId: string, name: string) => {
    const newSpace: Space = {
      id: `sp_${Date.now()}`,
      name,
      snippets: [],
      workspaceId
    };
    
    setWorkspaces(prev => prev.map(ws => 
      ws.id === workspaceId 
        ? { ...ws, spaces: [...ws.spaces, newSpace] }
        : ws
    ));
    toast.success('Space Created Successfully!');
  };

  const deleteWorkspace = (workspaceId: string) => {
    setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
    
    // Reset selections if deleted workspace was selected
    if (selectedWorkspace === workspaceId) {
      setSelectedWorkspace(null);
      setSelectedSpace(null);
    }
    
    toast.success('Workspace deleted successfully!');
  };

  const deleteSpace = (spaceId: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.filter(space => space.id !== spaceId)
    })));
    
    // Reset space selection if deleted space was selected
    if (selectedSpace === spaceId) {
      setSelectedSpace(null);
    }
    
    toast.success('Space deleted successfully!');
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmation.type === 'workspace') {
      deleteWorkspace(deleteConfirmation.id);
    } else {
      deleteSpace(deleteConfirmation.id);
    }
    setDeleteConfirmation({ show: false, type: 'workspace', id: '', name: '' });
  };

  const exportWorkspaces = () => {
    try {
      const exportData = {
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        workspaces: workspaces,
        pdfs: openPDFs.map(pdf => ({
          id: pdf.id,
          name: pdf.name,
          // Note: File data would need to be converted to base64 for full export
        }))
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `pdf_workspaces_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Workspaces exported successfully!');
    } catch (error) {
      toast.error('Failed to export workspaces');
    }
  };

  const importWorkspaces = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (importData.workspaces) {
        setWorkspaces(importData.workspaces);
        toast.success('Workspaces imported successfully!');
        
        // Select first workspace if available
        if (importData.workspaces.length > 0) {
          setSelectedWorkspace(importData.workspaces[0].id);
          if (importData.workspaces[0].spaces.length > 0) {
            setSelectedSpace(importData.workspaces[0].spaces[0].id);
          }
        }
      } else {
        toast.error('Invalid workspace file format');
      }
    } catch (error) {
      toast.error('Failed to import workspaces');
    }

    setShowWorkspaceImport(false);
    event.target.value = '';
  };

  const addSnippet = (snippet: Snippet) => {
    if (!selectedSpace || !selectedWorkspace) {
      toast.error('Please select a space first!');
      return;
    }

    setWorkspaces(prev => prev.map(ws => 
      ws.id === selectedWorkspace
        ? {
            ...ws,
            spaces: ws.spaces.map(space =>
              space.id === selectedSpace
                ? { ...space, snippets: [...space.snippets, snippet] }
                : space
            )
          }
        : ws
    ));
    toast.success('Snippet captured!');
  };

  const updateSnippet = (snippetId: string, updatedSnippet: Snippet) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        snippets: space.snippets.map(snippet =>
          snippet.id === snippetId ? updatedSnippet : snippet
        )
      }))
    })));
  };

  const deleteSnippet = (snippetId: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      spaces: ws.spaces.map(space => ({
        ...space,
        snippets: space.snippets.filter(snippet => snippet.id !== snippetId)
      }))
    })));
  };

  const handleFastExport = async (spaceId: string) => {
    const space = getCurrentSpace();
    if (!space || space.snippets.length === 0) {
      toast.error('No snippets to export!');
      return;
    }

    toast('Generating PDF with fast layout...', { duration: 3000 });
    
    try {
      await exportFastPDF(space.snippets, space.name);
      toast.success(`PDF exported successfully! (${space.snippets.length} snippets)`);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  const handleCustomExport = async (spaceId: string, layout: ExportLayout) => {
    const space = getCurrentSpace();
    if (!space) {
      toast.error('Space not found!');
      return;
    }

    toast('Generating custom layout PDF...', { duration: 5000 });
    
    try {
      await exportCustomPDF(space.snippets, layout, space.name);
      const pageCount = Math.max(...layout.snippets.map(s => s.pageIndex)) + 1;
      toast.success(`Custom PDF exported successfully! (${layout.snippets.length} snippets across ${pageCount} pages)`);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export custom PDF. Please try again.');
    }
  };

  const getCurrentSpace = () => {
    if (!selectedWorkspace || !selectedSpace) return null;
    const workspace = workspaces.find(ws => ws.id === selectedWorkspace);
    return workspace?.spaces.find(space => space.id === selectedSpace) || null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
      {/* Cyberpunk Header */}
      <header className="border-b border-purple-500/30 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Zap className="h-8 w-8 text-cyan-400" />
              <div className="absolute inset-0 h-8 w-8 text-cyan-400 animate-pulse opacity-50" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                PDF Workspace
              </h1>
              <p className="text-xs text-cyan-300">Cyberpunk Edition • AI-Enhanced</p>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="border-pink-400/50 text-pink-300 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>AI Upscaling</span>
            </Badge>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportWorkspaces}
              className="border-green-500/50 text-green-300 hover:bg-green-500/20"
            >
              <Save className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Dialog open={showWorkspaceImport} onOpenChange={setShowWorkspaceImport}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-blue-500/30">
                <DialogHeader>
                  <DialogTitle className="text-blue-300">Import Workspaces</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Select a workspace export file to import your saved workspaces.
                  </p>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={importWorkspaces}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </DialogContent>
            </Dialog>
            
            <Badge variant="outline" className="border-cyan-400/50 text-cyan-300">
              v2.1.0
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="border-b border-purple-500/20 bg-black/20">
          <TabsList className="w-full justify-start bg-transparent p-0">
            <TabsTrigger 
              value="viewer" 
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF Viewer
            </TabsTrigger>
            <TabsTrigger 
              value="workspace"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border-b-2 data-[state=active]:border-purple-400"
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Workspace
            </TabsTrigger>
          </TabsList>
        </div>

        {/* PDF Viewer Tab */}
        <TabsContent value="viewer" className="m-0 p-4">
          <div className="space-y-4">
            {/* PDF Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {openPDFs.map((pdf) => (
                <div key={pdf.id} className="relative shrink-0">
                  <Button
                    variant={activePDF === pdf.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActivePDF(pdf.id)}
                    className="bg-gray-800/50 border-cyan-500/30 hover:bg-cyan-500/20 pr-8"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {pdf.name}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      closePDF(pdf.id);
                    }}
                    className="absolute right-0 top-0 h-full px-2 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              
              <Dialog open={showPDFUpload} onOpenChange={setShowPDFUpload}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="shrink-0 border-dashed border-purple-500/50 text-purple-300">
                    <Plus className="w-4 h-4 mr-2" />
                    Add PDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-purple-500/30">
                  <DialogHeader>
                    <DialogTitle className="text-purple-300">Upload PDF Files</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                      Select one or more PDF files to open in the workspace.
                    </p>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handlePDFUpload}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Current Space Indicator */}
            {getCurrentSpace() && (
              <div className="flex items-center space-x-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <Folder className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">
                  Capturing to: <span className="font-medium text-purple-200">{getCurrentSpace()?.name}</span>
                </span>
                <Badge variant="outline" className="border-pink-400/50 text-pink-300 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Enhanced
                </Badge>
              </div>
            )}

            {/* PDF Viewer */}
            {activePDF && openPDFs.find(p => p.id === activePDF) ? (
              <PDFViewer 
                pdfId={activePDF}
                pdfName={openPDFs.find(p => p.id === activePDF)?.name || ''}
                onSnippetCapture={addSnippet}
              />
            ) : (
              <Card className="p-12 text-center bg-gray-900/30 border-gray-700/50">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No PDF Open</h3>
                <p className="text-gray-500 mb-4">Upload a PDF file to get started</p>
                <Button onClick={() => setShowPDFUpload(true)} className="bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/50 text-purple-300">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace" className="m-0 p-4">
          <WorkspaceManager
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            selectedSpace={selectedSpace}
            onWorkspaceSelect={setSelectedWorkspace}
            onSpaceSelect={setSelectedSpace}
            onCreateWorkspace={createWorkspace}
            onCreateSpace={createSpace}
            onExportSpace={handleFastExport}
            onCustomExport={handleCustomExport}
            onDeleteWorkspace={(id, name) => setDeleteConfirmation({ 
              show: true, type: 'workspace', id, name 
            })}
            onDeleteSpace={(id, name) => setDeleteConfirmation({ 
              show: true, type: 'space', id, name 
            })}
            onUpdateSnippet={updateSnippet}
            onDeleteSnippet={deleteSnippet}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.show} onOpenChange={(open) => 
        setDeleteConfirmation(prev => ({ ...prev, show: open }))
      }>
        <AlertDialogContent className="bg-gray-900 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-300">
              Delete {deleteConfirmation.type === 'workspace' ? 'Workspace' : 'Space'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete "{deleteConfirmation.name}"? 
              {deleteConfirmation.type === 'workspace' 
                ? ' This will permanently remove the workspace and all its spaces and snippets.' 
                : ' This will permanently remove the space and all its snippets.'
              }
              <br /><br />
              <span className="text-red-400 font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-500/20 hover:bg-red-500/30 border-red-400/50 text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster 
        theme="dark"
        className="[&>li]:bg-gray-900 [&>li]:border-cyan-500/30 [&>li]:text-cyan-100"
      />
    </div>
  );
}