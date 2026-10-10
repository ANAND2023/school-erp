import React, { useState, useEffect, useRef } from 'react';
import { Badge, IconButton, Popover, List, ListItem, ListItemText, Typography, Box, Button, Divider } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import apiClient from '../../api/client';
import { useNavigate } from 'react-router-dom';

export const AppNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadGlobal, setUnreadGlobal] = useState(0);
  const [chatUnreadTotal, setChatUnreadTotal] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      // 1. Fetch Global Notifications
      const res = await apiClient.get('/notifications');
      const data = res.data?.data || [];
      setNotifications(data);
      
      const lastRead = localStorage.getItem('lastReadNotificationTime');
      const unread = data.filter(n => !lastRead || new Date(n.sentAt) > new Date(lastRead));
      setUnreadGlobal(unread.length);

      // 2. Fetch Chat Unread Count
      const chatRes = await apiClient.get('/chat/users');
      const chatUsers = chatRes.data?.data || [];
      const chatUnread = chatUsers.reduce((sum, u) => sum + (u.unreadCount || 0), 0);
      setChatUnreadTotal(chatUnread);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setUnreadGlobal(0); // Only clear global notification badge
    if (notifications.length > 0) {
      localStorage.setItem('lastReadNotificationTime', notifications[0].sentAt);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const totalUnread = unreadGlobal + chatUnreadTotal;

  return (
    <>
      <style>{`
        @keyframes ripple {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }
      `}</style>
      <IconButton color="inherit" onClick={handleClick} size="small" sx={{ color: 'white', mr: 1 }}>
        <Badge 
          badgeContent={totalUnread} 
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#ef4444',
              color: 'white',
            },
            '& .MuiBadge-badge::after': totalUnread > 0 ? {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              animation: 'ripple 1.2s infinite ease-in-out',
              border: '1px solid #ef4444',
              content: '""',
            } : {}
          }}
        >
          <NotificationsIcon fontSize="small" />
        </Badge>
      </IconButton>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, minWidth: 260, maxWidth: 350, maxHeight: 400, overflowY: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Notifications</Typography>
          
          {chatUnreadTotal > 0 && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#eff6ff', borderRadius: 1, border: '1px solid #bfdbfe' }}>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                💬 You have {chatUnreadTotal} unread chat message{chatUnreadTotal > 1 ? 's' : ''}!
              </Typography>
              <Button size="small" variant="contained" color="primary" sx={{ mt: 1, p: 0.5, fontSize: '0.75rem' }} onClick={() => { handleClose(); navigate('/communication'); }}>
                View Chats
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 1 }} />

          {notifications.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>No new announcements</Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((n) => (
                <ListItem key={n.id} sx={{ borderBottom: '1px solid #eee', px: 0 }}>
                  <ListItemText 
                    primary={<Typography variant="subtitle2" fontWeight="bold">{n.title}</Typography>}
                    secondary={<Typography variant="body2">{n.message}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          )}
          
          <Button fullWidth size="small" onClick={() => { handleClose(); navigate('/communication'); }} sx={{ mt: 1 }}>
            Open Communication Hub
          </Button>
        </Box>
      </Popover>
    </>
  );
};
