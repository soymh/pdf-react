import React from 'react';
import SpaceItem from './SpaceItem';

function SpacesPanel({ spaces, activeSpaceId, onCreateSpace, onSetActiveSpace, onDeleteSpace, onExportSpace, onUpdateCaptures }) {
  return (
    <div className="spaces-panel">
      <div className="spaces-header">
        <span>🎯 SPACES</span>
        <button className="cyber-button" onClick={onCreateSpace} style={{ padding: '5px 10px', fontSize: '12px' }}>
          ➕ ADD
        </button>
      </div>
      <div className="spaces-list" id="spacesList">
        {spaces.length > 0 ? (
          spaces.map(space => (
            <SpaceItem
              key={space.id}
              space={space}
              isActive={space.id === activeSpaceId}
              onSetActive={onSetActiveSpace}
              onDelete={onDeleteSpace}
              onExport={onExportSpace}
              onUpdateCaptures={onUpdateCaptures}
            />
          ))
        ) : (
          <div className="empty-state">
            <p>Create spaces to organize your captures</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpacesPanel;
