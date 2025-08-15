import React from 'react';

function WorkspacesPanel({
  workspaces,
  activeWorkspaceId,
  onSetActive,
  onCreate,
  onDelete, // Future functionality
  onRename, // Future functionality
  onImport,
  onExport,
}) {
  return (
    <div className="workspaces-panel">
      <h2 className="workspaces-header">🚀 Workspaces</h2>
      <div className="workspaces-list">
        {workspaces.map(workspace => (
          <button // Keep this as button for individual workspaces
            key={workspace.id}
            className={`workspace-tab ${workspace.id === activeWorkspaceId ? 'active' : ''}`}
            onClick={() => onSetActive(workspace.id)}
          >
            {workspace.name}
          </button>
        ))}
      </div>
      {/* These buttons remain as <button> but will get new styling */}
      <button className="workspace-action-btn" onClick={onCreate}> {/* New class */}
        <span>➕ New Workspace</span>
      </button>
      <button className="workspace-action-btn" onClick={onImport}> {/* New class */}
        <span>📥 Import Workspace</span>
      </button>
      {activeWorkspaceId && (
        <button className="workspace-action-btn" onClick={onExport}> {/* New class */}
          <span>📤 Export Active Workspace</span>
        </button>
      )}
    </div>
  );
}

export default WorkspacesPanel;

