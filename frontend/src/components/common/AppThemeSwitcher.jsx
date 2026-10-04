import React, { useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputSwitch } from 'primereact/inputswitch';
import { useThemeStore, THEME_PALETTES } from '../../store/themeStore';

/**
 * Visual Theme Switcher widget for Topbar / Settings
 * Allows switching between 8 color palettes and toggling Dark/Light mode in real-time.
 */
export const AppThemeSwitcher = ({ className = '', style }) => {
  const op = useRef(null);
  const { currentColorName, currentColorHex, isDarkMode, setColor, toggleDarkMode, setDarkMode } = useThemeStore();

  return (
    <div className={`app-theme-switcher ${className}`} style={style}>
      {/* Trigger Button */}
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
        title="Change Theme & Colors"
        aria-label="Theme Settings"
      >
        <div
          className="border-circle"
          style={{
            width: '18px',
            height: '18px',
            backgroundColor: currentColorHex,
            boxShadow: '0 0 6px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #ffffff',
          }}
        >
          <i
            className={`pi ${isDarkMode ? 'pi-moon' : 'pi-palette'} text-white`}
            style={{ fontSize: '9px' }}
          />
        </div>
      </button>

      {/* Theme Picker Overlay Panel */}
      <OverlayPanel ref={op} style={{ width: '290px' }} className="shadow-4 border-round-xl">
        <div className="p-2">
          {/* Header */}
          <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
            <span className="font-bold text-900 text-sm flex align-items-center gap-2">
              <i className="pi pi-palette text-primary" />
              Theme & Colors
            </span>
            <span className="text-xs text-500 font-semibold uppercase">{currentColorName}</span>
          </div>

          {/* Color Palettes */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-500 block mb-2">PRIMARY ACCENT COLOR</label>
            <div className="grid grid-nogutter gap-2">
              {THEME_PALETTES.map((palette) => {
                const isSelected = currentColorName === palette.name;
                return (
                  <button
                    key={palette.name}
                    type="button"
                    onClick={() => setColor(palette.name)}
                    className="col flex align-items-center justify-content-center border-circle p-0 cursor-pointer"
                    style={{
                      width: '34px',
                      height: '34px',
                      backgroundColor: palette.color,
                      border: isSelected ? '3px solid #ffffff' : '2px solid transparent',
                      outline: isSelected ? `2px solid ${palette.color}` : 'none',
                      boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.25)' : 'none',
                      transition: 'transform 0.15s ease',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    }}
                    title={palette.name}
                  >
                    {isSelected && <i className="pi pi-check text-white text-xs font-bold" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark Mode Switch Row */}
          <div
            className="flex align-items-center justify-content-between pt-3 border-top-1 surface-border cursor-pointer select-none"
            onClick={() => toggleDarkMode()}
          >
            <div className="flex align-items-center gap-2">
              <i
                className={`pi ${isDarkMode ? 'pi-moon text-blue-400' : 'pi-sun text-orange-500'} text-lg`}
              />
              <span className="text-sm font-semibold text-700">Dark Mode</span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <InputSwitch
                checked={Boolean(isDarkMode)}
                onChange={(e) => setDarkMode(e.value)}
              />
            </div>
          </div>
        </div>
      </OverlayPanel>
    </div>
  );
};

export default AppThemeSwitcher;
