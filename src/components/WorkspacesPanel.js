import React from 'react';

function WorkspacesPanel({
  workspaces,
  activeWorkspaceId,
  onSetActive,
  onCreate,
  onDelete, // Future functionality
  onRename, // Future functionality
}) {
  return (
    <div className="workspaces-panel">
      <h2 className="workspaces-header">🚀 Workspaces</h2>
      <div className="workspaces-list">
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className={`workspace-tab ${workspace.id === activeWorkspaceId ? 'active' : ''}`}
            onClick={() => onSetActive(workspace.id)}
          >
            {workspace.name}
          </div>
        ))}
      </div>
      <button className="cyber-button new-workspace-btn" onClick={onCreate}>
        + New Workspace
      </button>
    </div>
  );
}

export default WorkspacesPanel;
