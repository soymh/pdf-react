import React from 'react';

function SettingsMenu({ currentBackend, onBackendChange, onClose }) {
  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 z-[1002] backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1a1a2e] p-[30px] rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.8),0_0_40px_rgba(255,0,255,0.5)] text-cyan-300 text-center w-[90%] max-w-[400px] relative border-2 border-cyan-300" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-fuchsia-500 mb-[25px] text-shadow-fuchsia">⚙️ SETTINGS ⚙️</h3>
        <div className="mb-5 text-left">
          <h4 className="text-cyan-300 mb-[15px] text-lg border-b border-dashed border-cyan-300 pb-[5px]">Upscaling Backend</h4>
          <label className="flex items-center mb-[10px] text-sm cursor-pointer text-cyan-200 relative">
            <div className="relative mr-[10px]">
              <input
                type="radio"
                value="webgpu"
                checked={currentBackend === 'webgpu'}
                onChange={() => onBackendChange('webgpu')}
                className="appearance-none w-[18px] h-[18px] border-2 border-cyan-300 rounded-full outline-none cursor-pointer flex items-center justify-center transition-all duration-200"
              />
              <span className={`absolute inset-0 flex items-center justify-center w-[18px] h-[18px] ${currentBackend === 'webgpu' ? 'opacity-100' : 'opacity-0'} transition-all duration-200`}>
                <span className="w-[10px] h-[10px] rounded-full bg-cyan-300"></span>
              </span>
            </div>
            WebGPU (Recommended)
          </label>
          <label className="flex items-center mb-[10px] text-sm cursor-pointer text-cyan-200 relative">
            <div className="relative mr-[10px]">
              <input
                type="radio"
                value="webgl"
                checked={currentBackend === 'webgl'}
                onChange={() => onBackendChange('webgl')}
                className="appearance-none w-[18px] h-[18px] border-2 border-cyan-300 rounded-full outline-none cursor-pointer flex items-center justify-center transition-all duration-200"
              />
              <span className={`absolute inset-0 flex items-center justify-center w-[18px] h-[18px] ${currentBackend === 'webgl' ? 'opacity-100' : 'opacity-0'} transition-all duration-200`}>
                <span className="w-[10px] h-[10px] rounded-full bg-cyan-300"></span>
              </span>
            </div>
            WebGL (Fallback)
          </label>
        </div>
        <button className="bg-gradient-to-br from-[#533483] to-[#9333ea] border border-cyber-purple text-cyber-light py-[10px] px-[20px] cursor-pointer uppercase tracking-[1px] transition-all duration-300 relative overflow-hidden rounded-xl hover:-translate-y-0.5 active:translate-y-0 w-full mt-[25px]" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}

export default SettingsMenu;