import React, { useState } from 'react';

function WorkspacesPanel({
  workspaces,
  activeWorkspaceId,
  onSetActive,
  onCreate,
  onDelete,
  onRename,
  onImport,
  onExport,
}) {
  const [editingWorkspaceId, setEditingWorkspaceId] = useState(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');

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
    <div className="workspaces-panel">
      <h2 className="workspaces-header">🚀 Workspaces</h2>
      <div className="workspaces-list">
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`workspace-item ${workspace.id === activeWorkspaceId ? 'active' : ''}`}
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
                className="workspace-rename-input"
                onClick={(e) => e.stopPropagation()} // Prevent activating workspace when clicking input
              />
            ) : (
              <span
                className="workspace-name-display"
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
              className="workspace-delete-btn"
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
      <button className="workspace-action-btn" onClick={onCreate}>
        <span>➕ New Workspace</span>
      </button>
      <button className="workspace-action-btn" onClick={onImport}>
        <span>📥 Import Workspace</span>
      </button>
      {activeWorkspaceId && (
        <button className="workspace-action-btn" onClick={onExport}>
          <span>📤 Export Active Workspace</span>
        </button>
      )}
    </div>
  );
}

export default WorkspacesPanel;
