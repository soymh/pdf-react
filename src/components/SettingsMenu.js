import React from 'react';
import './styles/settings-button.css'

function SettingsMenu({ currentBackend, onBackendChange, onClose }) {
  return (
    <div className="settings-menu-overlay" onClick={onClose}>
      <div className="settings-menu-content" onClick={(e) => e.stopPropagation()}>
        <h3>⚙️ SETTINGS ⚙️</h3>
        <div className="setting-group">
          <h4>Upscaling Backend</h4>
          <label>
            <input
              type="radio"
              value="webgpu"
              checked={currentBackend === 'webgpu'}
              onChange={() => onBackendChange('webgpu')}
            />
            WebGPU (Recommended)
          </label>
          <label>
            <input
              type="radio"
              value="webgl"
              checked={currentBackend === 'webgl'}
              onChange={() => onBackendChange('webgl')}
            />
            WebGL (Fallback)
          </label>
        </div>
        <button className="cyber-button" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}

export default SettingsMenu;
