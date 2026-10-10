import React, { useState, useEffect } from 'react';
import { Box, Card, Typography, Grid, List, ListItem, ListItemText, ListItemAvatar, Avatar, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Badge } from '@mui/material';
import { Send as SendIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';

export const CommunicationPage = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMsg, setNotifyMsg] = useState('');

  const isAdmin = user?.userType === 2 || user?.userType === 3 || user?.userType === 1;

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => {
      fetchUsers();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchChatHistory(selectedUser.id);
      const interval = setInterval(() => fetchChatHistory(selectedUser.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/chat/users');
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChatHistory = async (userId) => {
    try {
      const res = await apiClient.get(`/chat/${userId}`);
      setChatHistory(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedUser) return;
    try {
      await apiClient.post('/chat', { receiverId: selectedUser.id, message });
      setMessage('');
      fetchChatHistory(selectedUser.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendNotification = async () => {
    if (!notifyTitle || !notifyMsg) return;
    try {
      await apiClient.post('/notifications', { title: notifyTitle, message: notifyMsg });
      setNotifyModalOpen(false);
      setNotifyTitle('');
      setNotifyMsg('');
      alert("Global Notification Sent!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">Internal Communication</Typography>
        {isAdmin && (
          <Button variant="contained" color="warning" startIcon={<CampaignIcon />} onClick={() => setNotifyModalOpen(true)}>
            Broadcast Notification
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Card sx={{ height: '70vh', overflowY: 'auto' }}>
            <List>
              {users.map((u) => (
                <ListItem 
                  button 
                  key={u.id} 
                  selected={selectedUser?.id === u.id}
                  onClick={() => setSelectedUser(u)}
                >
                  <ListItemAvatar>
                    <Badge color="error" badgeContent={u.unreadCount} invisible={!u.unreadCount || u.unreadCount === 0} sx={{
                      '& .MuiBadge-badge::after': u.unreadCount > 0 ? {
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        borderRadius: '50%', animation: 'ripple 1.2s infinite ease-in-out',
                        border: '1px solid #ef4444', content: '""',
                      } : {}
                    }}>
                      <Avatar>{u.fullName?.charAt(0) || 'U'}</Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <Typography fontWeight={u.unreadCount > 0 ? 'bold' : 'normal'}>
                        {u.fullName}
                      </Typography>
                    } 
                    secondary={u.userType === 2 ? 'Admin' : 'Staff'} 
                  />
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>
        <Grid item xs={8}>
          <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {selectedUser ? (
              <>
                <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                  <Typography variant="h6">Chat with {selectedUser.fullName}</Typography>
                </Box>
                <Box sx={{ flex: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {chatHistory.map((msg) => {
                    const isMine = msg.senderId === user.id;
                    return (
                      <Box key={msg.id} sx={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isMine ? '#3b82f6' : '#e2e8f0', color: isMine ? 'white' : 'black' }}>
                          <Typography variant="body2">{msg.message}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'gray', ml: 1 }}>
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
                <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 1 }}>
                  <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="Type a message..." 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button variant="contained" onClick={handleSendMessage}><SendIcon /></Button>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <Typography color="textSecondary">Select a user to start chatting</Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Broadcast Modal */}
      <Dialog open={notifyModalOpen} onClose={() => setNotifyModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Global Notification</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Title" value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} sx={{ mt: 2, mb: 2 }} />
          <TextField fullWidth multiline rows={4} label="Message" value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifyModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSendNotification} variant="contained" color="warning">Send Broadcast</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
