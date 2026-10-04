import React, { useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { Slider } from 'primereact/slider';
import { useThemeStore } from '../../store/themeStore';

const PRESETS = [
  { label: 'Compact', size: 11, pct: '80%' },
  { label: 'Small', size: 12, pct: '85%' },
  { label: 'Default', size: 14, pct: '100%' },
  { label: 'Medium', size: 16, pct: '115%' },
  { label: 'Large', size: 18, pct: '130%' },
  { label: 'XL', size: 20, pct: '145%' },
];

/**
 * Universal App Font Size & Scale Controller for Topbar
 * Allows users to adjust the font size / display scale of the entire application in real-time.
 */
export const AppFontSizeScaler = ({ className = '', style }) => {
  const op = useRef(null);
  const {
    fontSize,
    minFontSize,
    maxFontSize,
    defaultFontSize,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    currentColorHex,
    isDarkMode,
  } = useThemeStore();

  const currentPercent = Math.round((fontSize / defaultFontSize) * 100);

  return (
    <div className={`app-font-scaler ${className}`} style={style}>
      {/* Topbar Trigger Button */}
      <button
        type="button"
        onClick={(e) => op.current.toggle(e)}
        className="p-button p-button-rounded p-button-text p-button-plain p-button-sm flex align-items-center justify-content-center p-0 text-white border-circle hover:surface-hover cursor-pointer"
        style={{
          width: '28px',
          height: '28px',
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          transition: 'all 0.2s',
          ...style,
        }}
        title={`Adjust App Font Size (${currentPercent}% / ${fontSize}px)`}
        aria-label="Font Size Adjuster"
      >
        <div className="flex align-items-center justify-content-center font-bold" style={{ fontSize: '11px', letterSpacing: '-0.5px' }}>
          <span style={{ fontSize: '12px' }}>A</span>
          <span style={{ fontSize: '9px', marginLeft: '1px', opacity: 0.9 }}>±</span>
        </div>
      </button>

      {/* Font Size Adjuster Overlay Panel */}
      <OverlayPanel ref={op} style={{ width: '310px' }} className="shadow-4 border-round-xl">
        <div className="p-2">
          {/* Header */}
          <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
            <span className="font-bold text-900 text-sm flex align-items-center gap-2">
              <i className="pi pi-text-width text-primary" />
              App Font Size & Scale
            </span>
            <span
              className="text-xs px-2 py-0.5 border-round font-bold"
              style={{
                backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
                color: isDarkMode ? '#f8fafc' : '#1e293b',
              }}
            >
              {currentPercent}% ({fontSize}px)
            </span>
          </div>

          {/* Quick Stepper (Decrease / Display / Increase) */}
          <div className="flex align-items-center justify-content-between gap-2 mb-3">
            <Button
              type="button"
              icon="pi pi-minus"
              label="A-"
              className="p-button-outlined p-button-sm flex-1 font-bold"
              disabled={fontSize <= minFontSize}
              onClick={() => decreaseFontSize(1)}
              style={{ height: '32px', fontSize: '12px' }}
              title="Decrease Font Size"
            />

            <Button
              type="button"
              label={fontSize === defaultFontSize ? 'Default (100%)' : 'Reset (100%)'}
              className="p-button-text p-button-sm font-semibold text-xs flex-1"
              onClick={resetFontSize}
              style={{ height: '32px' }}
              title="Reset to 14px (100%)"
            />

            <Button
              type="button"
              icon="pi pi-plus"
              label="A+"
              className="p-button-outlined p-button-sm flex-1 font-bold"
              disabled={fontSize >= maxFontSize}
              onClick={() => increaseFontSize(1)}
              style={{ height: '32px', fontSize: '12px' }}
              title="Increase Font Size"
            />
          </div>

          {/* Smooth Slider */}
          <div className="mb-3 px-1">
            <div className="flex justify-content-between text-xs text-500 font-medium mb-1">
              <span>{minFontSize}px (Min)</span>
              <span className="font-bold text-700">{fontSize}px</span>
              <span>{maxFontSize}px (Max)</span>
            </div>
            <Slider
              value={fontSize}
              onChange={(e) => setFontSize(e.value)}
              min={minFontSize}
              max={maxFontSize}
              step={1}
              className="w-full"
            />
          </div>

          {/* Quick Presets */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-500 block mb-2">QUICK PRESETS</label>
            <div className="grid grid-nogutter gap-1">
              {PRESETS.map((p) => {
                const isSelected = fontSize === p.size;
                return (
                  <button
                    key={p.size}
                    type="button"
                    onClick={() => setFontSize(p.size)}
                    className="col p-1 border-round text-center cursor-pointer border-1 transition-all"
                    style={{
                      backgroundColor: isSelected
                        ? (currentColorHex || 'var(--primary-color, #3B82F6)')
                        : (isDarkMode ? '#1e293b' : '#f8fafc'),
                      borderColor: isSelected
                        ? (currentColorHex || 'var(--primary-color, #3B82F6)')
                        : (isDarkMode ? '#334155' : '#e2e8f0'),
                      color: isSelected ? '#ffffff' : (isDarkMode ? '#cbd5e1' : '#334155'),
                      fontWeight: isSelected ? '700' : '500',
                      fontSize: '11px',
                    }}
                  >
                    <div>{p.pct}</div>
                    <div style={{ fontSize: '9px', opacity: 0.85 }}>{p.size}px</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Sample */}
          <div
            className="p-2 border-round surface-100 border-1 surface-border text-center select-none"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
            }}
          >
            <span className="text-500 text-xs block mb-1 font-semibold uppercase" style={{ fontSize: '9px' }}>Live Preview</span>
            <span className="font-medium" style={{ fontSize: `${fontSize}px` }}>
              Sample Text: School ERP (ERP System)
            </span>
          </div>
        </div>
      </OverlayPanel>
    </div>
  );
};

export default AppFontSizeScaler;
