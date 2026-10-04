import React from 'react';
import { Dialog } from 'primereact/dialog';
import { AppButton } from './AppButton';

/**
 * Common ConfirmDialog component wrapping PrimeReact Dialog
 * Supports both MUI (open/onCancel/onConfirm) and PrimeReact (visible/onHide) prop conventions.
 */
export const AppConfirmDialog = ({
  open,
  visible,
  title,
  header,
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmSeverity = 'danger',
  confirmColor, // MUI fallback
  icon = 'pi pi-exclamation-triangle',
  onConfirm,
  onCancel,
  onHide,
  loading = false,
  width = '420px',
  ...rest
}) => {
  const isVisible = visible !== undefined ? visible : Boolean(open);
  const handleClose = onHide || onCancel;
  const dialogHeader = header || title || 'Confirmation';

  // Map MUI color to PrimeReact severity if needed
  const resolvedSeverity = confirmColor === 'error' ? 'danger' : (confirmSeverity || 'danger');

  const footer = (
    <div className="flex justify-content-end gap-2 pt-2">
      <AppButton
        label={cancelText}
        icon="pi pi-times"
        severity="secondary"
        variant="text"
        onClick={handleClose}
        disabled={loading}
      />
      <AppButton
        label={confirmText}
        icon="pi pi-check"
        severity={resolvedSeverity}
        loading={loading}
        onClick={onConfirm}
      />
    </div>
  );

  return (
    <Dialog
      visible={isVisible}
      onHide={handleClose}
      header={dialogHeader}
      footer={footer}
      style={{ width }}
      modal
      closable={!loading}
      {...rest}
    >
      <div className="flex align-items-center gap-3 pt-2">
        {icon && <i className={`${icon} text-3xl text-orange-500 flex-shrink-0`} />}
        <span className="text-700 font-medium line-height-3">
          {message || children}
        </span>
      </div>
    </Dialog>
  );
};

export default AppConfirmDialog;
