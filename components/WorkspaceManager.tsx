import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu';
import { Plus, Folder, Grid3x3, Download, Trash2, Move, ChevronRight, Sparkles } from 'lucide-react';
import SnippetGrid from './SnippetGrid';
import ExportDialog from './ExportSnippets';
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

interface WorkspaceManagerProps {
  workspaces: Workspace[];
  selectedWorkspace: string | null;
  selectedSpace: string | null;
  onWorkspaceSelect: (id: string) => void;
  onSpaceSelect: (id: string) => void;
  onCreateWorkspace: (name: string) => void;
  onCreateSpace: (workspaceId: string, name: string) => void;
  onExportSpace: (spaceId: string) => void;
  onCustomExport: (spaceId: string, layout: ExportLayout) => void;
  onDeleteWorkspace: (id: string, name: string) => void;
  onDeleteSpace: (id: string, name: string) => void;
  onUpdateSnippet?: (snippetId: string, updatedSnippet: Snippet) => void;
  onDeleteSnippet?: (snippetId: string) => void;
}

export default function WorkspaceManager({
  workspaces,
  selectedWorkspace,
  selectedSpace,
  onWorkspaceSelect,
  onSpaceSelect,
  onCreateWorkspace,
  onCreateSpace,
  onExportSpace,
  onCustomExport,
  onDeleteWorkspace,
  onDeleteSpace,
  onUpdateSnippet,
  onDeleteSnippet
}: WorkspaceManagerProps) {
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false);
  const [showSpaceDialog, setShowSpaceDialog] = useState(false);

  const currentWorkspace = workspaces.find(ws => ws.id === selectedWorkspace);
  const currentSpace = currentWorkspace?.spaces.find(sp => sp.id === selectedSpace);

  const handleCreateWorkspace = () => {
    if (newWorkspaceName.trim()) {
      onCreateWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setShowWorkspaceDialog(false);
    }
  };

  const handleCreateSpace = () => {
    if (newSpaceName.trim() && selectedWorkspace) {
      onCreateSpace(selectedWorkspace, newSpaceName.trim());
      setNewSpaceName('');
      setShowSpaceDialog(false);
    }
  };

  const handleFastExport = () => {
    if (selectedSpace) {
      onExportSpace(selectedSpace);
    }
  };

  const handleCustomExport = (layout: ExportLayout) => {
    if (selectedSpace) {
      onCustomExport(selectedSpace, layout);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Workspace Manager
          </h2>
          <p className="text-gray-400 text-sm flex items-center space-x-2">
            <span>Organize your PDF snippets into workspaces and spaces</span>
            <Badge variant="outline" className="border-pink-400/50 text-pink-300 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Enhanced
            </Badge>
          </p>
        </div>
        
        <Dialog open={showWorkspaceDialog} onOpenChange={setShowWorkspaceDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-purple-500/30">
            <DialogHeader>
              <DialogTitle className="text-purple-300">Create New Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="workspace-name" className="text-gray-300">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g., Research Project Alpha"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowWorkspaceDialog(false)} className="border-gray-600">
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkspace} className="bg-purple-500 hover:bg-purple-600">
                  Create Workspace
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Workspace Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-gray-900/50 border-purple-500/20">
            <div className="p-4">
              <h3 className="font-semibold text-purple-300 mb-4">Workspaces</h3>
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {workspaces.map((workspace) => (
                    <ContextMenu key={workspace.id}>
                      <ContextMenuTrigger>
                        <Button
                          variant={selectedWorkspace === workspace.id ? "default" : "ghost"}
                          className={`w-full justify-start ${
                            selectedWorkspace === workspace.id 
                              ? "bg-purple-500/30 text-purple-200 border-purple-400/50" 
                              : "hover:bg-gray-700/50 text-gray-300"
                          }`}
                          onClick={() => onWorkspaceSelect(workspace.id)}
                        >
                          <Folder className="w-4 h-4 mr-3" />
                          <span className="truncate">{workspace.name}</span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {workspace.spaces.length}
                          </Badge>
                        </Button>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="bg-gray-800 border-gray-700">
                        <ContextMenuItem 
                          onClick={() => onDeleteWorkspace(workspace.id, workspace.name)}
                          className="text-red-400 hover:bg-red-500/20 focus:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Workspace
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </Card>

          {/* Spaces in Selected Workspace */}
          {currentWorkspace && (
            <Card className="bg-gray-900/50 border-cyan-500/20">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-cyan-300">Spaces</h3>
                  <Dialog open={showSpaceDialog} onOpenChange={setShowSpaceDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-cyan-400/50 text-cyan-300">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-cyan-500/30">
                      <DialogHeader>
                        <DialogTitle className="text-cyan-300">Create New Space</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="space-name" className="text-gray-300">Space Name</Label>
                          <Input
                            id="space-name"
                            value={newSpaceName}
                            onChange={(e) => setNewSpaceName(e.target.value)}
                            placeholder="e.g., Key Findings"
                            className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowSpaceDialog(false)} className="border-gray-600">
                            Cancel
                          </Button>
                          <Button onClick={handleCreateSpace} className="bg-cyan-500 hover:bg-cyan-600">
                            Create Space
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <ScrollArea className="h-40">
                  <div className="space-y-1">
                    {currentWorkspace.spaces.map((space) => (
                      <ContextMenu key={space.id}>
                        <ContextMenuTrigger>
                          <Button
                            variant={selectedSpace === space.id ? "default" : "ghost"}
                            size="sm"
                            className={`w-full justify-start text-sm ${
                              selectedSpace === space.id 
                                ? "bg-cyan-500/30 text-cyan-200 border-cyan-400/50" 
                                : "hover:bg-gray-700/50 text-gray-300"
                            }`}
                            onClick={() => onSpaceSelect(space.id)}
                          >
                            <Grid3x3 className="w-3 h-3 mr-2" />
                            <span className="truncate">{space.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {space.snippets.length}
                            </Badge>
                          </Button>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-gray-800 border-gray-700">
                          <ContextMenuItem 
                            onClick={() => onDeleteSpace(space.id, space.name)}
                            className="text-red-400 hover:bg-red-500/20 focus:bg-red-500/20"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Space
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </Card>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {currentSpace ? (
            <Card className="bg-gray-900/30 border-gray-700/50">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center text-sm text-gray-400 mb-1">
                      <span>{currentWorkspace?.name}</span>
                      <ChevronRight className="w-4 h-4 mx-2" />
                      <span className="text-cyan-300">{currentSpace.name}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                      <span>{currentSpace.snippets.length} Snippet{currentSpace.snippets.length !== 1 ? 's' : ''}</span>
                      {currentSpace.snippets.length > 0 && (
                        <Badge variant="outline" className="border-pink-400/50 text-pink-300 text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Ready
                        </Badge>
                      )}
                    </h3>
                  </div>
                  
                  <div className="flex space-x-2">
                    <ExportDialog
                      snippets={currentSpace.snippets}
                      spaceName={currentSpace.name}
                      onFastExport={handleFastExport}
                      onCustomExport={handleCustomExport}
                    >
                      <Button
                        disabled={currentSpace.snippets.length === 0}
                        className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border-green-500/50 text-green-300"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </ExportDialog>
                  </div>
                </div>

                {currentSpace.snippets.length > 0 ? (
                  <SnippetGrid 
                    snippets={currentSpace.snippets} 
                    onUpdateSnippet={onUpdateSnippet}
                    onDeleteSnippet={onDeleteSnippet}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-20">📄</div>
                    <p className="text-gray-400 text-lg mb-2">No snippets yet</p>
                    <p className="text-gray-500 text-sm mb-4">
                      Switch to the PDF Viewer and use Capture Mode to add snippets to this space.
                    </p>
                    <Badge variant="outline" className="border-pink-400/50 text-pink-300">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI upscaling available for all captured snippets
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="bg-gray-900/30 border-gray-700/50">
              <div className="p-6 text-center">
                <div className="text-6xl mb-4 opacity-20">📁</div>
                <p className="text-gray-400 text-lg mb-2">Select a space to get started</p>
                <p className="text-gray-500 text-sm mb-4">
                  Choose a workspace and space from the sidebar to view and manage your snippets.
                </p>
                <Badge variant="outline" className="border-cyan-400/50 text-cyan-300">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI-powered image enhancement included
                </Badge>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}