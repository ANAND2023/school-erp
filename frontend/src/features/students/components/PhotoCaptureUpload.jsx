import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  FileUpload as UploadIcon,
  Cameraswitch as SwitchCameraIcon,
  Close as CloseIcon,
  PhotoCameraOutlined as PlaceholderCameraIcon,
} from '@mui/icons-material';

export const PhotoCaptureUpload = ({
  label = 'Student Photo',
  value,
  onChange,
  disabled = false,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Start webcam
  const startCamera = async (mode = facingMode) => {
    setCameraLoading(true);
    setCameraError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Unable to access webcam. Please check camera permissions or upload an image file.');
    } finally {
      setCameraLoading(false);
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Handle open modal
  const handleOpenLiveCamera = () => {
    setIsCameraOpen(true);
    startCamera(facingMode);
  };

  // Handle close modal
  const handleCloseCamera = () => {
    stopCamera();
    setIsCameraOpen(false);
    setCameraError('');
  };

  // Switch front/back camera
  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture frame from video stream
  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      onChange(dataUrl);
      handleCloseCamera();
    }
  };

  // Helper to compress images client-side before sending to server
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload with automatic compression
  const handleFileInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        onChange(compressed);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          onChange(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearPhoto = (e) => {
    e.stopPropagation();
    onChange('');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 120 }}>
      {/* Label */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: '#475569',
          mb: 0.8,
          textAlign: 'center',
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>

      {/* Photo Frame */}
      <Box
        sx={{
          position: 'relative',
          width: 96,
          height: 108,
          bgcolor: '#eef2f6',
          border: '1.5px dashed #94a3b8',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#3b82f6',
            bgcolor: '#f8fafc',
          },
        }}
      >
        {value ? (
          <>
            <Box
              component="img"
              src={value}
              alt={label}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* Delete/Clear Button */}
            {!disabled && (
              <IconButton
                size="small"
                onClick={handleClearPhoto}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.55)',
                  color: '#ffffff',
                  p: 0.3,
                  '&:hover': {
                    bgcolor: 'rgba(239, 68, 68, 0.9)',
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            )}
          </>
        ) : (
          <PlaceholderCameraIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
        )}
      </Box>

      {/* Floating Action Buttons (Red Camera & Blue Upload) */}
      {!disabled && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mt: '-14px',
            zIndex: 2,
          }}
        >
          {/* Live Webcam Button (Red/Coral) */}
          <Tooltip title="Capture with Camera / Webcam">
            <IconButton
              size="small"
              onClick={handleOpenLiveCamera}
              sx={{
                bgcolor: '#ff6b6b',
                color: '#ffffff',
                width: 26,
                height: 26,
                boxShadow: '0 2px 5px rgba(255, 107, 107, 0.4)',
                '&:hover': {
                  bgcolor: '#fa5252',
                  transform: 'scale(1.08)',
                },
                transition: 'all 0.15s ease',
              }}
            >
              <CameraIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          {/* File Upload Button (Blue) */}
          <Tooltip title="Upload from Device / Computer">
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              sx={{
                bgcolor: '#1976d2',
                color: '#ffffff',
                width: 26,
                height: 26,
                boxShadow: '0 2px 5px rgba(25, 118, 210, 0.4)',
                '&:hover': {
                  bgcolor: '#1565c0',
                  transform: 'scale(1.08)',
                },
                transition: 'all 0.15s ease',
              }}
            >
              <UploadIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Capture Photo Modal (Matching User's Screenshot Exactly) */}
      <Dialog
        open={isCameraOpen}
        onClose={handleCloseCamera}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1.5,
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '1.25rem',
            color: '#1e293b',
            py: 1,
          }}
        >
          Capture Photo
        </DialogTitle>

        <DialogContent sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {cameraError ? (
            <Alert severity="error" sx={{ width: '100%', mb: 1 }}>
              {cameraError}
            </Alert>
          ) : (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 280,
                bgcolor: '#000000',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {cameraLoading && (
                <CircularProgress size={36} sx={{ color: '#ffffff', position: 'absolute' }} />
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none', // Mirror selfie camera
                }}
              />

              {/* Switch Camera Overlay Button */}
              <Tooltip title="Switch Camera">
                <IconButton
                  onClick={handleSwitchCamera}
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    bgcolor: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.85)',
                    },
                  }}
                >
                  <SwitchCameraIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 1, pt: 1.5 }}>
          <Button
            variant="outlined"
            onClick={handleCloseCamera}
            sx={{
              color: '#334155',
              borderColor: '#cbd5e1',
              borderRadius: 2,
              px: 3,
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                borderColor: '#94a3b8',
                bgcolor: '#f1f5f9',
              },
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleCapturePhoto}
            disabled={cameraLoading || !!cameraError}
            sx={{
              bgcolor: '#1976d2',
              borderRadius: 2,
              px: 3.5,
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 2px 6px rgba(25, 118, 210, 0.4)',
              '&:hover': {
                bgcolor: '#1565c0',
              },
            }}
          >
            Capture
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhotoCaptureUpload;
