import React from 'react';
import { Dialog } from 'primereact/dialog';
import { AppButton } from './AppButton';

/**
 * Common AppModal component wrapping PrimeReact Dialog
 * Styled with gorgeous Crimson/Pink gradient header matching ERP sample!
 */
export const AppModal = ({
  visible,
  onHide,
  header,
  icon,
  children,
  footer,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitSeverity = 'primary',
  submitIcon = 'pi pi-check',
  loading = false,
  width = '600px',
  breakpoints = { '960px': '75vw', '641px': '95vw' },
  maximizable = false,
  closable = true,
  dismissableMask = false,
  headerGradient,
  headerColor,
  className = '',
  style,
  ...rest
}) => {
  const defaultFooter = (
    <div className="flex justify-content-end gap-2 pt-2">
      <AppButton
        label={cancelLabel}
        icon="pi pi-times"
        severity="secondary"
        variant="text"
        onClick={onHide}
        disabled={loading}
      />
      {onSubmit && (
        <AppButton
          label={submitLabel}
          icon={submitIcon}
          severity={submitSeverity}
          loading={loading}
          onClick={onSubmit}
        />
      )}
    </div>
  );

  const headerBg = headerColor || headerGradient || 'var(--app-modal-header-bg, linear-gradient(135deg, var(--primary-color, #3B82F6) 0%, #1d4ed8 100%))';

  // Custom styled header element
  const customHeader = header ? (
    <div className="flex align-items-center gap-2 w-full text-white">
      {icon && (
        <span className="text-xl flex align-items-center">
          {typeof icon === 'string' ? <i className={icon} /> : icon}
        </span>
      )}
      <span className="font-bold text-lg tracking-wide text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
        {header}
      </span>
    </div>
  ) : null;

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={customHeader || header}
      footer={footer !== undefined ? footer : (onSubmit ? defaultFooter : null)}
      style={{ width, ...style }}
      breakpoints={breakpoints}
      modal
      closable={closable}
      maximizable={maximizable}
      dismissableMask={dismissableMask}
      className={`app-modal app-pink-modal ${className}`}
      {...rest}
    >
      <div className="pt-2">{children}</div>
    </Dialog>
  );
};

export default AppModal;
