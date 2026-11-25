import React, { useState, useRef, useEffect } from 'react';
import { Tooltip } from '@mui/material';

/**
 * SlideActionCell Component
 * 
 * Collapsed by default into a sleek, compact trigger button.
 * On desktop hover (or mobile tap):
 * Smoothly slides out an action pill towards the LEFT, revealing all action icons.
 * Clicking outside or leaving hover automatically collapses it back.
 * 
 * Perfectly optimized for mobile and desktop screens.
 */
export const SlideActionCell = ({
  children,
  triggerTooltip = 'Click or Hover for Actions',
  triggerIcon = 'pi pi-chevron-left',
  label = 'Actions',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Close when clicked outside (crucial for mobile tap experience)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220); // Smooth grace period before collapsing
  };

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`slide-action-container ${isOpen ? 'is-open' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '36px',
        width: '100%',
        zIndex: isOpen ? 50 : 1,
      }}
    >
      {/* Collapsed Trigger Button */}
      <Tooltip title={isOpen ? '' : triggerTooltip} arrow placement="left">
        <button
          type="button"
          onClick={handleTriggerClick}
          aria-label="Actions"
          aria-expanded={isOpen}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            height: '28px',
            padding: '0 8px',
            borderRadius: '14px',
            border: isOpen ? '1px solid #0284c7' : '1px solid #cbd5e1',
            background: isOpen ? '#e0f2fe' : '#f8fafc',
            color: isOpen ? '#0369a1' : '#475569',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            transition: 'all 0.2s ease',
            boxShadow: isOpen ? '0 0 0 2px rgba(2, 132, 199, 0.15)' : 'none',
            userSelect: 'none',
          }}
          onFocus={handleMouseEnter}
        >
          <i
            className={isOpen ? 'pi pi-chevron-right' : triggerIcon}
            style={{
              fontSize: '10px',
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isOpen ? 'rotate(0deg)' : 'translateX(-1px)',
            }}
          />
          <span style={{ fontSize: '10.5px', letterSpacing: '0.2px' }}>
            {isOpen ? 'Close' : label}
          </span>
        </button>
      </Tooltip>

      {/* Floating Action Pill Sliding Out to the LEFT */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: `translateY(-50%) ${isOpen ? 'translateX(0)' : 'translateX(18px)'}`,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          visibility: isOpen ? 'visible' : 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 8px',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '9999px',
          boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.16), 0 2px 6px -1px rgba(15, 23, 42, 0.08)',
          zIndex: 1000,
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, visibility 0.2s',
          whiteSpace: 'nowrap',
        }}
        onClick={(e) => {
          // Keep open if interactive elements inside are clicked, or close if specified
          e.stopPropagation();
        }}
      >
        {/* Child Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {children}
        </div>

        {/* Small Close Button on the right of the expanded pill */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          title="Close Actions"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: 'none',
            background: '#f1f5f9',
            color: '#64748b',
            cursor: 'pointer',
            marginLeft: '2px',
            padding: 0,
            fontSize: '9px',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <i className="pi pi-times" style={{ fontSize: '9px' }} />
        </button>
      </div>
    </div>
  );
};

export default SlideActionCell;
