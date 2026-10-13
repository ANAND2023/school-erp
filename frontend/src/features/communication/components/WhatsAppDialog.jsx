import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { whatsappService } from '../services/whatsappService';
import { useAuthStore } from '../../../store/authStore';

export const WhatsAppDialog = ({
  open,
  onClose,
  recipientName = '',
  recipientPhone = '',
  recipientMobile = '',
  recipientRole = 'Parent / Guardian',
  moduleKey = 'general',
  moduleTitle = '',
  templateData = {},
  variables = {},
  defaultMessage = '',
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);

  const effectivePhone = recipientPhone || recipientMobile || '';
  const effectiveData = { ...(variables || {}), ...(templateData || {}) };

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setLoading(true);
    setCopied(false);
    setPhone(effectivePhone);

    const init = async () => {
      const cfg = await whatsappService.getConfig();
      if (!isMounted) return;
      setConfig(cfg);

      const enabled = whatsappService.isModuleEnabled(cfg, moduleKey);
      setIsModuleEnabled(enabled);

      if (defaultMessage) {
        setMessage(defaultMessage);
      } else {
        const template = cfg[moduleKey]?.template || cfg.general?.template || '';
        const schoolInfo = {
          SchoolName: user?.schoolName || 'Our School',
          SchoolPhone: user?.schoolPhone || user?.mobile || '',
        };
        const rendered = whatsappService.interpolateTemplate(template, {
          ...schoolInfo,
          ...effectiveData,
        });
        setMessage(rendered);
      }
      setLoading(false);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [open, effectivePhone, moduleKey, defaultMessage, JSON.stringify(effectiveData)]);

  const handleCopy = () => {
    if (!message) return;
    navigator.clipboard?.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!phone) {
      alert('Please provide a recipient mobile number.');
      return;
    }
    whatsappService.sendDirectMessage(phone, message);
    if (onClose) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header with WhatsApp branding */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
          color: '#ffffff',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <WhatsAppIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              {moduleTitle || {
                enquiry: 'Enquiry Notification',
                admission: 'Admission Confirmation',
                feeReceipt: 'Fee Payment Receipt',
                feeDemand: 'Fee Dues Reminder',
                attendance: 'Attendance Alert',
                birthday: 'Birthday Wishes',
                general: 'WhatsApp Notice',
              }[moduleKey] || 'WhatsApp Notification'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '11px' }}>
              WhatsApp Direct Notification Service
            </Typography>
          </Box>
        </Stack>

        <IconButton size="small" onClick={onClose} sx={{ color: '#ffffff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={32} sx={{ color: '#128C7E' }} />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {!isModuleEnabled && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <strong>Module Disabled in Super Admin:</strong> WhatsApp notifications for{' '}
                <strong>{moduleKey}</strong> are currently set to disabled. You can still send manual messages if necessary.
              </Alert>
            )}

            {/* Recipient Card */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    bgcolor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {recipientName ? recipientName[0].toUpperCase() : <PersonIcon fontSize="small" />}
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0f172a' }}>
                    {recipientName || 'Recipient'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {recipientRole}
                  </Typography>
                </Box>
              </Box>

              <Chip
                icon={<WhatsAppIcon style={{ fontSize: '14px', color: '#25D366' }} />}
                label={phone || 'No phone'}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  borderColor: '#25D366',
                  bgcolor: '#f0fdf4',
                }}
              />
            </Box>

            {/* Recipient Phone Field (editable if needed) */}
            <TextField
              label="Recipient WhatsApp Number"
              size="small"
              fullWidth
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9811223344"
              helperText="10-digit Indian mobile number (country code 91 will be added automatically)"
              InputProps={{
                startAdornment: <PhoneIcon sx={{ mr: 1, color: '#64748b', fontSize: 18 }} />,
              }}
              sx={{ bgcolor: '#ffffff' }}
            />

            {/* Message Box */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  MESSAGE CONTENT (PRE-FILLED TEMPLATE)
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  startIcon={copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  onClick={handleCopy}
                  sx={{ fontSize: '11px', textTransform: 'none', py: 0 }}
                >
                  {copied ? 'Copied!' : 'Copy Text'}
                </Button>
              </Box>

              <TextField
                multiline
                rows={5}
                fullWidth
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter message text..."
                sx={{
                  bgcolor: '#ffffff',
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'inherit',
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                You can review or make changes to the text before sending.
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, justifyContent: 'space-between', bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600, textTransform: 'none' }}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || !phone || !message.trim()}
          startIcon={<WhatsAppIcon />}
          sx={{
            bgcolor: '#25D366',
            '&:hover': { bgcolor: '#128C7E' },
            fontWeight: 700,
            textTransform: 'none',
            px: 2.5,
            py: 0.8,
            borderRadius: 2,
          }}
        >
          Open & Send on WhatsApp
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppDialog;
