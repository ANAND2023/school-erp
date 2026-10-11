import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Universal Dynamic AppModal / Modal Component
 * 
 * Features:
 * 1. Gorgeous Crimson/Pink Gradient Header matching Hospital/ERP Standard (Image 2 style)
 * 2. Dynamic Props: supports both MUI (open, onClose, title, actions) and PrimeReact (visible, onHide, header, footer)
 * 3. Icon support in Header
 * 4. Customizable header background via headerColor / headerGradient
 * 5. Smooth elevation shadow & curved rounded corners
 * 6. Responsive width breakdown
 */
export const Modal = ({
  open,
  visible,
  onClose,
  onHide,
  title,
  header,
  icon,
  children,
  actions,
  footer,
  maxWidth = 'sm',
  width,
  fullWidth = true,
  headerGradient,
  headerColor,
  closable = true,
  PaperProps,
  ...rest
}) => {
  const isVisible = visible !== undefined ? visible : Boolean(open);
  const handleClose = onHide || onClose;
  const modalHeader = header || title;
  const modalFooter = footer !== undefined ? footer : actions;

  const widthMap = {
    xs: '420px',
    sm: '600px',
    md: '800px',
    lg: '1000px',
    xl: '1200px',
  };
  const resolvedWidth = width || widthMap[maxWidth] || '600px';

  // Header background style: customizable or defaults to dynamic theme gradient CSS variable
  const headerBg = headerColor || headerGradient || 'var(--app-modal-header-bg, linear-gradient(135deg, var(--primary-color, #3B82F6) 0%, #1d4ed8 100%))';

  return (
    <Dialog
      open={isVisible}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        ...PaperProps,
        sx: {
          borderRadius: 2.5,
          overflow: 'hidden',
          boxShadow: 'var(--app-modal-shadow, 0 24px 48px -12px rgba(59, 130, 246, 0.25), 0 12px 24px -8px rgba(0, 0, 0, 0.12))',
          ...(width ? { width: resolvedWidth, maxWidth: '95vw' } : {}),
          ...PaperProps?.sx,
        },
      }}
      {...rest}
    >
      {modalHeader && (
        <DialogTitle
          sx={{
            m: 0,
            px: 2.5,
            py: 1.5,
            background: headerBg,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            {icon && (
              <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '1.25rem', color: '#ffffff' }}>
                {typeof icon === 'string' ? <i className={icon} /> : icon}
              </Box>
            )}
            <Typography
              component="div"
              sx={{
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#ffffff',
                letterSpacing: '0.2px',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              }}
            >
              {modalHeader}
            </Typography>
          </Box>

          {closable && handleClose && (
            <IconButton
              aria-label="close"
              onClick={handleClose}
              size="small"
              sx={{
                color: '#ffffff',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                width: 28,
                height: 28,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                  transform: 'rotate(90deg)',
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </DialogTitle>
      )}

      <DialogContent
        sx={{
          p: 3,
          pt: '20px !important',
          bgcolor: '#ffffff',
        }}
      >
        {children}
      </DialogContent>

      {modalFooter && (
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid #f1f5f9',
            bgcolor: '#f8fafc',
          }}
        >
          {modalFooter}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default Modal;
