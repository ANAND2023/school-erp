import React from 'react';
import { Dialog } from 'primereact/dialog';
import { AppButton } from './AppButton';

/**
 * Common AppModal component wrapping PrimeReact Dialog
 * 
 * Supports custom footer, automatic Save/Cancel footer actions,
 * responsive breakpoints, maximizable mode, and backdrop click dismiss.
 */
export const AppModal = ({
  visible,
  onHide,
  header,
  children,
  footer,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitSeverity = 'primary',
  submitIcon = 'pi pi-check',
  loading = false,
  width = '550px',
  breakpoints = { '960px': '75vw', '641px': '95vw' },
  maximizable = false,
  closable = true,
  dismissableMask = false,
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

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={header}
      footer={footer !== undefined ? footer : (onSubmit ? defaultFooter : null)}
      style={{ width, ...style }}
      breakpoints={breakpoints}
      modal
      closable={closable}
      maximizable={maximizable}
      dismissableMask={dismissableMask}
      className={`app-modal ${className}`}
      {...rest}
    >
      <div className="pt-2">{children}</div>
    </Dialog>
  );
};

export default AppModal;
