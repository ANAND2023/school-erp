import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Modal component built on MUI Dialog.
 * Compatible with all MUI form controls (Select, Menu, DatePicker, etc.)
 * Supports both MUI (open, onClose, title, maxWidth) and PrimeReact prop conventions.
 */
export const Modal = ({
  open,
  visible,
  onClose,
  onHide,
  title,
  header,
  children,
  maxWidth = 'sm',
  width,
  fullWidth = true,
  ...rest
}) => {
  const isVisible = visible !== undefined ? visible : Boolean(open);
  const handleClose = onHide || onClose;
  const modalHeader = header || title;

  const widthMap = {
    xs: '420px',
    sm: '600px',
    md: '800px',
    lg: '1000px',
    xl: '1200px',
  };
  const resolvedWidth = width || widthMap[maxWidth] || '600px';

  return (
    <Dialog
      open={isVisible}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          borderRadius: 2,
          ...(width ? { width: resolvedWidth, maxWidth: '95vw' } : {}),
        },
      }}
      {...rest}
    >
      {modalHeader && (
        <DialogTitle
          sx={{
            m: 0,
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {modalHeader}
          </Typography>
          {handleClose && (
            <IconButton
              aria-label="close"
              onClick={handleClose}
              size="small"
              sx={{
                color: (theme) => theme.palette.grey[500],
                '&:hover': {
                  color: (theme) => theme.palette.grey[800],
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>
      )}
      <DialogContent sx={{ p: 3, pt: modalHeader ? '20px !important' : 3 }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;

