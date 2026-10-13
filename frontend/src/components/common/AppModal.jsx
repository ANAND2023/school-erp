import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Typography,
  Box,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { useThemeStore, shadeColor } from '../../store/themeStore';

/**
 * Universal Common Modal Component
 * 
 * Layout:
 * 1. Top Header:
 *    - Left Top: Title with optional icon & subtitle
 *    - Top Right: Cancel / Close (X) button with smooth hover effect
 * 2. Middle Body:
 *    - Scrollable DialogContent with clean padding & styled scrollbar
 * 3. Bottom Footer:
 *    - 2 Buttons:
 *      a. Cancel button (secondary/outlined) -> closes modal
 *      b. Submit/Save/Confirm button (primary/contained) -> triggers action with loading spinner
 * 
 * Props:
 * - open / visible: boolean
 * - onClose / onHide / onCancel: function
 * - title / header: ReactNode | string
 * - subtitle: ReactNode | string
 * - icon: ReactNode | string (e.g. 'pi pi-user' or <MuiIcon />)
 * - children: ReactNode (modal body)
 * - showFooter: boolean (default true)
 * - footer / actions: ReactNode (custom footer override)
 * - cancelText / cancelLabel: string (default 'Cancel')
 * - confirmText / submitLabel / saveLabel / okText: string (default 'Save')
 * - confirmLoadingText: string (default 'Please wait...')
 * - onConfirm / onSubmit / onOk: function
 * - loading / confirmLoading: boolean
 * - disabled / confirmDisabled: boolean
 * - confirmColor / confirmSeverity: string ('primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info')
 * - formId / form: string (HTML form id to trigger submit)
 * - maxWidth: 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default 'sm')
 * - width: string (e.g. '600px')
 * - fullWidth: boolean (default true)
 * - dividers: boolean (default true)
 * - headerGradient / headerColor / headerBg: custom header background
 * - closable: boolean (default true)
 */
export const AppModal = ({
  open,
  visible,
  onClose,
  onHide,
  onCancel,
  title,
  header,
  subtitle,
  icon,
  topRightAction,
  children,
  showFooter = true,
  footer,
  actions,
  cancelText,
  cancelLabel = 'Cancel',
  confirmText,
  submitLabel,
  saveLabel,
  okText,
  confirmLoadingText,
  onConfirm,
  onSubmit,
  onOk,
  loading = false,
  confirmLoading = false,
  disabled = false,
  confirmDisabled = false,
  confirmColor = 'primary',
  confirmSeverity,
  cancelVariant = 'outlined',
  confirmVariant = 'contained',
  cancelIcon,
  confirmIcon,
  cancelButtonProps,
  confirmButtonProps,
  showCancel = true,
  showConfirm = true,
  formId,
  form,
  submitType,
  maxWidth = 'sm',
  width,
  fullWidth = true,
  dividers = true,
  headerGradient,
  headerColor,
  headerBg,
  closable = true,
  hideHeader = false,
  contentSx,
  PaperProps,
  ...rest
}) => {
  const theme = useTheme();
  const { currentColorHex, isDarkMode: storeDarkMode } = useThemeStore();
  const isDarkMode = storeDarkMode !== undefined ? storeDarkMode : theme.palette.mode === 'dark';

  // Primary theme color resolution: matches active application theme dynamically
  const primaryColor = currentColorHex || theme.palette.primary?.main || '#14b8a6';
  const darkerColor = shadeColor(primaryColor, -20);
  const muchDarkerColor = shadeColor(primaryColor, -35);

  const isVisible = visible !== undefined ? visible : Boolean(open);
  const modalTitle = header || title;
  const isLoading = loading || confirmLoading;
  const isConfirmDisabled = disabled || confirmDisabled || isLoading;

  // Resolved Labels
  const resolvedCancelLabel = cancelText || cancelLabel || 'Cancel';
  const resolvedConfirmLabel = confirmText || submitLabel || saveLabel || okText || 'Save';
  const resolvedLoadingLabel = confirmLoadingText || 'Please wait...';

  // Close handler
  const handleClose = (event, reason) => {
    if (isLoading && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    if (onClose) onClose(event, reason);
    else if (onHide) onHide(event, reason);
    else if (onCancel) onCancel(event, reason);
  };

  // Confirm / Submit handler
  const handleConfirm = (e) => {
    if (onConfirm) onConfirm(e);
    else if (onSubmit) onSubmit(e);
    else if (onOk) onOk(e);
  };

  // Map widths
  const widthMap = {
    xs: '420px',
    sm: '600px',
    md: '800px',
    lg: '1000px',
    xl: '1200px',
  };
  const resolvedWidth = width || widthMap[maxWidth] || '600px';

  // Header background gradient dynamically matching the theme
  const defaultHeaderBg = `linear-gradient(135deg, ${primaryColor} 0%, ${darkerColor} 60%, ${muchDarkerColor} 100%)`;
  const resolvedHeaderBg =
    headerBg ||
    headerColor ||
    headerGradient ||
    defaultHeaderBg;

  // Resolved HTML submit type & form association
  const targetForm = formId || form;
  const resolvedType = submitType || (targetForm ? 'submit' : 'button');

  // Custom or standard footer with 2 buttons
  const customFooter = footer !== undefined ? footer : actions;

  const defaultTwoButtonsFooter = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1.5,
        width: '100%',
      }}
    >
      {showCancel && (
        <Button
          variant={cancelVariant}
          onClick={(e) => {
            if (onCancel) onCancel(e);
            else handleClose(e, 'cancelButton');
          }}
          disabled={isLoading}
          sx={{
            minWidth: 88,
            fontWeight: 600,
            fontSize: '0.875rem',
            textTransform: 'none',
            borderRadius: '6px',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1',
            color: isDarkMode ? '#e2e8f0' : '#475569',
            '&:hover': {
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
              bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
            },
            ...cancelButtonProps?.sx,
          }}
          {...cancelButtonProps}
        >
          {cancelIcon && (
            <Box component="span" sx={{ mr: 0.75, display: 'inline-flex', alignItems: 'center' }}>
              {cancelIcon}
            </Box>
          )}
          {resolvedCancelLabel}
        </Button>
      )}

      {showConfirm && (
        <Button
          variant={confirmVariant}
          color={confirmSeverity || confirmColor || 'primary'}
          type={resolvedType}
          form={targetForm}
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          sx={{
            minWidth: 96,
            fontWeight: 700,
            fontSize: '0.875rem',
            textTransform: 'none',
            borderRadius: '6px',
            ...(confirmColor === 'primary' && !confirmSeverity ? {
              backgroundColor: `${primaryColor} !important`,
              backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${darkerColor} 100%) !important`,
              color: '#ffffff !important',
              border: 'none !important',
              boxShadow: `0 2px 8px ${primaryColor}50 !important`,
              '&:hover': {
                backgroundImage: `linear-gradient(135deg, ${darkerColor} 0%, ${muchDarkerColor} 100%) !important`,
                boxShadow: `0 4px 14px ${primaryColor}70 !important`,
              },
              '&.Mui-disabled': {
                backgroundColor: `${isDarkMode ? '#334155' : '#e2e8f0'} !important`,
                backgroundImage: 'none !important',
                color: `${isDarkMode ? '#64748b' : '#94a3b8'} !important`,
                boxShadow: 'none !important',
              },
            } : {
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
            }),
            ...confirmButtonProps?.sx,
          }}
          {...confirmButtonProps}
        >
          {isLoading ? (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} color="inherit" thickness={5} />
              <span>{resolvedLoadingLabel}</span>
            </Box>
          ) : (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              {confirmIcon && (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  {confirmIcon}
                </Box>
              )}
              <span>{resolvedConfirmLabel}</span>
            </Box>
          )}
        </Button>
      )}
    </Box>
  );

  return (
    <Dialog
      open={isVisible}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      scroll="paper"
      PaperProps={{
        ...PaperProps,
        sx: {
          borderRadius: 2.5,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 48px)',
          boxShadow: isDarkMode
            ? '0 24px 48px -12px rgba(0, 0, 0, 0.7), 0 12px 24px -8px rgba(0, 0, 0, 0.5)'
            : `var(--app-modal-shadow, 0 25px 50px -12px ${primaryColor}40, 0 10px 25px -5px rgba(0, 0, 0, 0.12))`,
          ...(width ? { width: resolvedWidth, maxWidth: '95vw' } : {}),
          ...PaperProps?.sx,
        },
      }}
      {...rest}
    >
      {/* 1. TOP HEADER */}
      {!hideHeader && modalTitle && (
        <DialogTitle
          sx={{
            m: 0,
            px: 2.5,
            py: 1.5,
            flexShrink: 0,
            background: `${resolvedHeaderBg} !important`,
            color: '#ffffff !important',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            userSelect: 'none',
          }}
        >
          {/* Left Top: Title with optional icon & subtitle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            {icon && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1.25rem',
                  color: '#ffffff',
                  flexShrink: 0,
                }}
              >
                {typeof icon === 'string' ? <i className={icon} /> : icon}
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="div"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: '#ffffff',
                  letterSpacing: '0.2px',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {modalTitle}
              </Typography>
              {subtitle && (
                <Typography
                  variant="caption"
                  component="div"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.75rem',
                    lineHeight: 1.2,
                    mt: 0.2,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Top Right: Optional action + Cancel (Close) Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {topRightAction}
            {closable && (
              <Tooltip title="Close">
                <IconButton
                  aria-label="close"
                  onClick={(e) => handleClose(e, 'cancelButton')}
                  size="small"
                  disabled={isLoading}
                  sx={{
                    color: '#ffffff',
                    bgcolor: 'rgba(255, 255, 255, 0.18)',
                    width: 30,
                    height: 30,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.35)',
                      transform: 'rotate(90deg)',
                    },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </DialogTitle>
      )}

      {/* 2. MIDDLE BODY */}
      <DialogContent
        dividers={dividers}
        sx={{
          p: 3,
          pt: '20px !important',
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f8fafc' : '#0f172a',
          flex: '1 1 auto',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
          },
          ...contentSx,
        }}
      >
        {children}
      </DialogContent>

      {/* 3. BOTTOM FOOTER WITH 2 BUTTONS */}
      {showFooter && (
        <DialogActions
          sx={{
            px: 3,
            py: 1.75,
            flexShrink: 0,
            borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f1f5f9',
            bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
          }}
        >
          {customFooter !== undefined ? customFooter : defaultTwoButtonsFooter}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default AppModal;
