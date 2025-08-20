import React, { useState, useEffect, useRef } from 'react';

function WorkspacesPanel({
  workspaces,
  activeWorkspaceId,
  onSetActive,
  onCreate,
  onDelete,
  onRename,
  onImport,
  onExport,
  renderSettingsButton, // New prop to receive the settings button
}) {
  const [editingWorkspaceId, setEditingWorkspaceId] = useState(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);
  const expandTimeoutRef = useRef(null);


  // Handle panel expansion/collapse
  const handleMouseEnter = () => {
    if (!isDragging) {
      clearTimeout(expandTimeoutRef.current);
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      expandTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 300); // Small delay to prevent flickering
    }
  };

  // Global drag event listeners
  useEffect(() => {
    const handleDragStart = (e) => {
      // Check if the drag started from a capture thumbnail
      if (e.target.classList.contains('capture-thumbnail')) {
        setIsDragging(true);
        setIsExpanded(true);
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      // Don't auto-collapse after drag ends, let user decide
    };

    // Listen to global drag events
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      clearTimeout(expandTimeoutRef.current);
    };
  }, []);

  const handleRenameClick = (workspaceId, currentName) => {
    setEditingWorkspaceId(workspaceId);
    setEditingWorkspaceName(currentName);
  };

  const handleNameChange = (e) => {
    setEditingWorkspaceName(e.target.value);
  };

  const handleRenameBlur = () => {
    if (editingWorkspaceId) {
      onRename(editingWorkspaceId, editingWorkspaceName);
      setEditingWorkspaceId(null);
      setEditingWorkspaceName('');
    }
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameBlur();
    } else if (e.key === 'Escape') {
      setEditingWorkspaceId(null);
      setEditingWorkspaceName('');
    }
  };

  return (
    <div 
      ref={panelRef}
      className={`workspaces-panel ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <h2 className="text-lg text-center p-[15px] text-cyber-light border-b border-cyber-purple/40">🚀 Workspaces</h2>
      <div className="absolute top-[10px] left-[10px] bg-transparent z-[1001]">
        {renderSettingsButton()} {/* Render the settings button here */}
      </div>
      <div className="flex flex-col gap-2 p-[15px] mt-0 flex-1 overflow-y-auto">
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`flex items-center justify-between p-2 border border-cyber-border-color rounded-md bg-cyber-panel-bg cursor-pointer transition-all duration-200 relative overflow-hidden ${
              workspace.id === activeWorkspaceId 
                ? 'bg-cyber-active-bg border-cyber-active-border shadow-[0_0_15px_var(--cyber-glow-color)]' 
                : 'hover:bg-cyber-hover-bg hover:border-cyber-accent-color hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]'
            }`}
            onClick={() => onSetActive(workspace.id)} // Set active on overall item click
          >
            {editingWorkspaceId === workspace.id ? (
              <input
                type="text"
                value={editingWorkspaceName}
                onChange={handleNameChange}
                onBlur={handleRenameBlur}
                onKeyDown={handleRenameKeyDown}
                autoFocus
                className="flex-grow bg-cyber-input-bg border border-cyber-border-color rounded p-1 text-cyber-text-color-light text-base font-fira outline-none mr-[10px] text-white"
                onClick={(e) => e.stopPropagation()} // Prevent activating workspace when clicking input
              />
            ) : (
              <span
                className="flex-grow pr-[10px] whitespace-nowrap overflow-hidden text-ellipsis font-bold text-cyber-text-color-light transition-colors duration-200 text-white"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent tab activation
                  handleRenameClick(workspace.id, workspace.name);
                }}
                title="Click to rename"
              >
                {workspace.name}
              </span>
            )}
            <button
              className="bg-none border-none text-cyber-delete-icon-color text-lg cursor-pointer p-1 flex items-center justify-center opacity-0 transition-opacity duration-200 rounded-full text-white"
              onClick={(e) => {
                e.stopPropagation(); // Prevent activating the workspace tab
                onDelete(workspace.id);
              }}
              title="Delete Workspace"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
      {/* These buttons remain as <button> but will get new styling */}
      <button className="w-[calc(100%-30px)] mx-[15px] my-0 mb-[10px] p-[15px] rounded-xl bg-cyber-blue/70 border border-cyber-purple/30 text-cyber-light cursor-pointer font-inherit text-base text-left transition-all duration-300 shadow-none flex items-center gap-[10px] hover:bg-[#533483]/60 hover:border-cyber-purple hover:-translate-y-0.5 hover:shadow-[0_0_10px_rgba(147,51,234,0.4)] text-white" onClick={onCreate}>
        <span>➕ New Workspace</span>
      </button>
      <button className="w-[calc(100%-30px)] mx-[15px] my-0 mb-[10px] p-[15px] rounded-xl bg-cyber-blue/70 border border-cyber-purple/30 text-cyber-light cursor-pointer font-inherit text-base text-left transition-all duration-300 shadow-none flex items-center gap-[10px] hover:bg-[#533483]/60 hover:border-cyber-purple hover:-translate-y-0.5 hover:shadow-[0_0_10px_rgba(147,51,234,0.4)] text-white" onClick={onImport}>
        <span>📥 Import Workspace</span>
      </button>
      {activeWorkspaceId && (
        <button className="w-[calc(100%-30px)] mx-[15px] my-0 mb-[10px] p-[15px] rounded-xl bg-cyber-blue/70 border border-cyber-purple/30 text-cyber-light cursor-pointer font-inherit text-base text-left transition-all duration-300 shadow-none flex items-center gap-[10px] hover:bg-[#533483]/60 hover:border-cyber-purple hover:-translate-y-0.5 hover:shadow-[0_0_10px_rgba(147,51,234,0.4)] text-white" onClick={onExport}>
          <span>📤 Export Active Workspace</span>
        </button>
      )}
    </div>
  );
}

export default WorkspacesPanel;