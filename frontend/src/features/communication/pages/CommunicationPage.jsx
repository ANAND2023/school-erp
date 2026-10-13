import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  Avatar,
  TextField,
  Button,
  Badge,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Campaign as CampaignIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  DoneAll as DoneAllIcon,
  EmojiEmotions as EmojiIcon,
  Forum as ForumIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { Modal } from '../../../components/Modal';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore, shadeColor } from '../../../store/themeStore';

const AVATAR_GRADIENTS = [
  ['#3b82f6', '#1d4ed8'], // Blue
  ['#8b5cf6', '#6d28d9'], // Purple
  ['#ec4899', '#be185d'], // Pink
  ['#10b981', '#047857'], // Emerald
  ['#f59e0b', '#b45309'], // Amber
  ['#06b6d4', '#0e7490'], // Cyan
  ['#6366f1', '#4338ca'], // Indigo
  ['#14b8a6', '#0f766e'], // Teal
];

const getAvatarGradient = (id, name = '') => {
  const code = (id || 0) + (name ? name.charCodeAt(0) : 0);
  const pair = AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
};

const getRoleBadge = (userType) => {
  switch (userType) {
    case 1:
      return { label: 'Super Admin', color: 'error' };
    case 2:
      return { label: 'School Admin', color: 'primary' };
    case 3:
      return { label: 'Branch Admin', color: 'info' };
    case 4:
      return { label: 'Teacher', color: 'success' };
    case 5:
      return { label: 'Staff', color: 'warning' };
    default:
      return { label: 'Staff', color: 'default' };
  }
};

const formatDateGroup = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

const QUICK_EMOJIS = ['😊', '👍', '🏫', '📝', '✅', '🙏', '❤️', '👏'];

export const CommunicationPage = () => {
  const { user } = useAuthStore();
  const { currentColorHex, isDarkMode } = useThemeStore();
  const themeColor = currentColorHex || '#14b8a6';
  const themeDarker = shadeColor(themeColor, -20);
  const themeDarkest = shadeColor(themeColor, -35);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'admins' | 'staff' | 'unread'
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Broadcast Modal State
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMsg, setNotifyMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const isAdmin = user?.userType === 1 || user?.userType === 2 || user?.userType === 3;

  // Auto-scroll to bottom of messages
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    fetchUsers(true);
    const interval = setInterval(() => {
      fetchUsers(false);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchChatHistory(selectedUser.id, true);
      const interval = setInterval(() => fetchChatHistory(selectedUser.id, false), 4000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom(false);
  }, [chatHistory]);

  const fetchUsers = async (showLoader = false) => {
    if (showLoader) setUsersLoading(true);
    try {
      const res = await apiClient.get('/chat/users');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching chat users:', err);
    } finally {
      if (showLoader) setUsersLoading(false);
    }
  };

  const fetchChatHistory = async (userId, showLoader = false) => {
    if (showLoader) setHistoryLoading(true);
    try {
      const res = await apiClient.get(`/chat/${userId}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setChatHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      if (showLoader) setHistoryLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const textToSend = message.trim();
    if (!textToSend || !selectedUser || sending) return;

    setSending(true);
    setMessage('');
    setShowEmojiPicker(false);

    // Optimistic message append
    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      senderId: user?.id,
      receiverId: selectedUser.id,
      message: textToSend,
      sentAt: new Date().toISOString(),
      isRead: false,
    };
    setChatHistory((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      await apiClient.post('/chat', { receiverId: selectedUser.id, message: textToSend });
      fetchChatHistory(selectedUser.id, false);
      fetchUsers(false);
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on error
      setChatHistory((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
      chatInputRef.current?.focus();
    }
  };

  const handleSendNotification = async () => {
    if (!notifyTitle.trim() || !notifyMsg.trim()) return;
    setBroadcasting(true);
    try {
      await apiClient.post('/notifications', { title: notifyTitle, message: notifyMsg });
      setNotifyModalOpen(false);
      setNotifyTitle('');
      setNotifyMsg('');
      alert('Global Campus Broadcast Published Successfully!');
    } catch (err) {
      console.error('Error sending broadcast notification:', err);
      alert('Failed to send notification. Please try again.');
    } finally {
      setBroadcasting(false);
    }
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        u.fullName?.toLowerCase().includes(query) ||
        getRoleBadge(u.userType).label.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Tab filter
      if (activeFilter === 'admins') {
        return u.userType === 1 || u.userType === 2 || u.userType === 3;
      }
      if (activeFilter === 'staff') {
        return u.userType === 4 || u.userType === 5;
      }
      if (activeFilter === 'unread') {
        return (u.unreadCount || 0) > 0;
      }
      return true;
    });
  }, [users, searchQuery, activeFilter]);

  const totalUnreadCount = useMemo(() => {
    return users.reduce((sum, u) => sum + (u.unreadCount || 0), 0);
  }, [users]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate = null;

    chatHistory.forEach((msg) => {
      const dateLabel = formatDateGroup(msg.sentAt);
      if (dateLabel !== lastDate) {
        groups.push({ type: 'date', label: dateLabel });
        lastDate = dateLabel;
      }
      groups.push({ type: 'msg', data: msg });
    });

    return groups;
  }, [chatHistory]);

  return (
    <Box sx={{ pb: 2 }}>
      <style>{`
        @keyframes subtlePulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes rippleRing {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      {/* Top Header Card */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 2.5,
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          boxShadow: isDarkMode ? '0 4px 14px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)',
          border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${themeColor} 0%, ${themeDarker} 100%)`,
              color: '#ffffff',
              boxShadow: `0 4px 12px ${themeColor}40`,
            }}
          >
            <ForumIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
              Internal Staff Messenger
            </Typography>
            <Typography variant="caption" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              Real-time communication, teacher coordination & campus broadcast bulletins
            </Typography>
          </Box>
        </Box>

        {isAdmin && (
          <Button
            variant="contained"
            onClick={() => setNotifyModalOpen(true)}
            startIcon={<CampaignIcon />}
            sx={{
              background: `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)`,
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 2.5,
              py: 0.9,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              },
            }}
          >
            Broadcast Announcement
          </Button>
        )}
      </Box>

      {/* Main Split Chat Layout */}
      <Card
        sx={{
          height: { xs: 'auto', md: 'calc(100vh - 180px)' },
          minHeight: '620px',
          borderRadius: 3.5,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          boxShadow: isDarkMode ? '0 12px 36px rgba(0,0,0,0.45)' : '0 12px 36px rgba(0,0,0,0.06)',
          border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
        }}
      >
        {/* LEFT PANEL: Contacts Directory */}
        <Box
          sx={{
            width: { xs: '100%', md: 360 },
            borderRight: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
            flexShrink: 0,
          }}
        >
          {/* Contacts Header & Search */}
          <Box sx={{ p: 2, pb: 1.5, borderBottom: isDarkMode ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                  Colleagues & Staff
                </Typography>
                <Chip
                  label={users.length}
                  size="small"
                  sx={{
                    height: 20,
                    fontWeight: 700,
                    fontSize: '11px',
                    bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                    color: isDarkMode ? '#cbd5e1' : '#475569',
                    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                  }}
                />
              </Box>

              <Tooltip title="Refresh directory">
                <IconButton
                  size="small"
                  onClick={() => fetchUsers(true)}
                  disabled={usersLoading}
                  sx={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
                >
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Search Input */}
            <TextField
              fullWidth
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or role..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: isDarkMode ? '#64748b' : '#94a3b8' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                  fontSize: '0.85rem',
                },
              }}
            />

            {/* Quick Filter Tabs */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'admins', label: 'Admins' },
                { id: 'staff', label: 'Teachers' },
                { id: 'unread', label: totalUnreadCount > 0 ? `Unread (${totalUnreadCount})` : 'Unread' },
              ].map((tab) => {
                const isTabActive = activeFilter === tab.id;
                return (
                  <Chip
                    key={tab.id}
                    label={tab.label}
                    size="small"
                    onClick={() => setActiveFilter(tab.id)}
                    sx={{
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      height: 24,
                      borderRadius: 1.5,
                      bgcolor: isTabActive
                        ? `${themeColor} !important`
                        : isDarkMode
                        ? 'rgba(255,255,255,0.06)'
                        : '#ffffff',
                      color: isTabActive ? '#ffffff !important' : isDarkMode ? '#94a3b8' : '#64748b',
                      border: isTabActive ? 'none' : isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: isTabActive ? themeColor : isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Contact List */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 1,
              '&::-webkit-scrollbar': { width: '5px' },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                borderRadius: '3px',
              },
            }}
          >
            {usersLoading && users.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={28} sx={{ color: themeColor }} />
              </Box>
            ) : filteredUsers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                <Typography variant="body2" sx={{ color: isDarkMode ? '#64748b' : '#94a3b8', fontStyle: 'italic' }}>
                  No colleagues found matching your search.
                </Typography>
              </Box>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                const role = getRoleBadge(u.userType);
                const hasUnread = (u.unreadCount || 0) > 0;

                return (
                  <Box
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.25,
                      mb: 0.5,
                      borderRadius: 2.5,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      bgcolor: isSelected
                        ? isDarkMode
                          ? 'rgba(255, 255, 255, 0.08)'
                          : `${themeColor}12`
                        : 'transparent',
                      borderLeft: isSelected ? `4px solid ${themeColor}` : '4px solid transparent',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                      '&:hover': {
                        bgcolor: isSelected
                          ? isDarkMode
                            ? 'rgba(255, 255, 255, 0.1)'
                            : `${themeColor}18`
                          : isDarkMode
                          ? 'rgba(255, 255, 255, 0.04)'
                          : '#f1f5f9',
                      },
                    }}
                  >
                    {/* Avatar with Online indicator */}
                    <Box sx={{ position: 'relative' }}>
                      <Avatar
                        sx={{
                          width: 42,
                          height: 42,
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          background: getAvatarGradient(u.id, u.fullName),
                          color: '#ffffff',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        }}
                      >
                        {u.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>

                      {/* Online Green Indicator Dot */}
                      <DotIcon
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          fontSize: 14,
                          color: '#22c55e',
                          bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
                          borderRadius: '50%',
                        }}
                      />
                    </Box>

                    {/* Name & Details */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isSelected || hasUnread ? 800 : 600,
                            color: isDarkMode ? '#f8fafc' : '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {u.fullName}
                        </Typography>

                        {/* Unread Pill */}
                        {hasUnread && (
                          <Chip
                            label={u.unreadCount}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '10px',
                              fontWeight: 800,
                              bgcolor: '#ef4444',
                              color: '#ffffff',
                              animation: 'subtlePulse 1.5s infinite ease-in-out',
                            }}
                          />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Chip
                          label={role.label}
                          size="small"
                          color={role.color}
                          variant="outlined"
                          sx={{
                            height: 17,
                            fontSize: '9.5px',
                            fontWeight: 700,
                            borderRadius: '4px',
                            borderWidth: 1,
                            px: 0.25,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: isDarkMode ? '#64748b' : '#94a3b8',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          Campus Staff
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        {/* RIGHT PANEL: Chat Canvas */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
          {selectedUser ? (
            <>
              {/* Active Chat Header */}
              <Box
                sx={{
                  p: 2,
                  px: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                  borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  zIndex: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 42,
                      height: 42,
                      fontWeight: 700,
                      background: getAvatarGradient(selectedUser.id, selectedUser.fullName),
                      color: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    {selectedUser.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                        {selectedUser.fullName}
                      </Typography>
                      <Chip
                        label={getRoleBadge(selectedUser.userType).label}
                        size="small"
                        color={getRoleBadge(selectedUser.userType).color}
                        sx={{ height: 18, fontSize: '10px', fontWeight: 700 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                      <DotIcon sx={{ fontSize: 10, color: '#22c55e' }} />
                      <Typography variant="caption" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '11px', fontWeight: 600 }}>
                        Active in this school campus
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title="Refresh chat stream">
                    <IconButton
                      size="small"
                      onClick={() => fetchChatHistory(selectedUser.id, true)}
                      disabled={historyLoading}
                      sx={{
                        color: isDarkMode ? '#cbd5e1' : '#475569',
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                        '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#e2e8f0' },
                      }}
                    >
                      <RefreshIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Message Stream Area */}
              <Box
                sx={{
                  flex: 1,
                  p: { xs: 1.5, sm: 2.5 },
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  bgcolor: isDarkMode ? '#0b1120' : '#f1f5f9',
                  backgroundImage: isDarkMode
                    ? 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)'
                    : 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                  },
                }}
              >
                {historyLoading && chatHistory.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                    <CircularProgress size={32} sx={{ color: themeColor }} />
                  </Box>
                ) : chatHistory.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 1,
                      textAlign: 'center',
                      p: 4,
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${themeColor}18`,
                        color: themeColor,
                        mb: 2,
                      }}
                    >
                      <ForumIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                      Say Hello to {selectedUser.fullName}!
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', maxWidth: 360, mt: 0.5 }}>
                      No messages yet between you and {selectedUser.fullName}. Type a message below to initiate internal communication.
                    </Typography>
                  </Box>
                ) : (
                  groupedMessages.map((item, idx) => {
                    // Date Header Badge
                    if (item.type === 'date') {
                      return (
                        <Box key={`date-${idx}`} sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                          <Chip
                            label={item.label}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '11px',
                              fontWeight: 700,
                              bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                              color: isDarkMode ? '#cbd5e1' : '#475569',
                              backdropFilter: 'blur(4px)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            }}
                          />
                        </Box>
                      );
                    }

                    const msg = item.data;
                    const isMine = msg.senderId === user?.id;
                    const timeFormatted = msg.sentAt
                      ? new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <Box
                        key={msg.id}
                        sx={{
                          display: 'flex',
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                          maxWidth: { xs: '85%', sm: '72%' },
                          gap: 1,
                        }}
                      >
                        {/* Other user's avatar */}
                        {!isMine && (
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              fontSize: '11px',
                              fontWeight: 700,
                              mt: 'auto',
                              mb: 0.5,
                              background: getAvatarGradient(selectedUser.id, selectedUser.fullName),
                              color: '#ffffff',
                            }}
                          >
                            {selectedUser.fullName?.charAt(0) || 'U'}
                          </Avatar>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                          {/* Message Bubble */}
                          <Box
                            sx={{
                              p: 1.5,
                              px: 2,
                              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              bgcolor: isMine ? themeColor : isDarkMode ? '#1e293b' : '#ffffff',
                              backgroundImage: isMine
                                ? `linear-gradient(135deg, ${themeColor} 0%, ${themeDarker} 100%)`
                                : 'none',
                              color: isMine ? '#ffffff' : isDarkMode ? '#f8fafc' : '#0f172a',
                              boxShadow: isMine
                                ? `0 4px 14px ${themeColor}40`
                                : isDarkMode
                                ? '0 4px 12px rgba(0,0,0,0.3)'
                                : '0 2px 8px rgba(0,0,0,0.05)',
                              border: !isMine
                                ? isDarkMode
                                  ? '1px solid #334155'
                                  : '1px solid #e2e8f0'
                                : 'none',
                              wordBreak: 'break-word',
                              position: 'relative',
                            }}
                          >
                            <Typography variant="body2" sx={{ lineHeight: 1.5, fontSize: '0.9rem' }}>
                              {msg.message}
                            </Typography>
                          </Box>

                          {/* Timestamp and Sent/Read Receipt */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, px: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: '10.5px', color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                              {timeFormatted}
                            </Typography>
                            {isMine && (
                              <DoneAllIcon
                                sx={{
                                  fontSize: 14,
                                  color: msg.isRead ? '#38bdf8' : isDarkMode ? '#64748b' : '#94a3b8',
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Quick Emojis Row (Collapsible) */}
              {showEmojiPicker && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                    borderTop: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                  }}
                >
                  <Typography variant="caption" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                    Quick Reaction:
                  </Typography>
                  {QUICK_EMOJIS.map((emoji) => (
                    <Button
                      key={emoji}
                      onClick={() => {
                        setMessage((prev) => prev + emoji);
                        chatInputRef.current?.focus();
                      }}
                      sx={{
                        minWidth: 32,
                        p: 0.5,
                        fontSize: '1.1rem',
                        lineHeight: 1,
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9' },
                      }}
                    >
                      {emoji}
                    </Button>
                  ))}
                </Box>
              )}

              {/* Bottom Message Input Dock */}
              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: 1.5,
                  px: 2,
                  bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                  borderTop: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {/* Emoji Toggle Button */}
                <Tooltip title="Quick Emojis">
                  <IconButton
                    size="small"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    sx={{ color: showEmojiPicker ? themeColor : isDarkMode ? '#94a3b8' : '#64748b' }}
                  >
                    <EmojiIcon />
                  </IconButton>
                </Tooltip>

                {/* Message Input Box */}
                <TextField
                  fullWidth
                  size="small"
                  inputRef={chatInputRef}
                  placeholder={`Write a message to ${selectedUser.fullName}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  autoComplete="off"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
                      fontSize: '0.9rem',
                    },
                  }}
                />

                {/* Send Button */}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!message.trim() || sending}
                  sx={{
                    minWidth: 44,
                    width: 44,
                    height: 40,
                    borderRadius: 2.5,
                    p: 0,
                    background: `linear-gradient(135deg, ${themeColor} 0%, ${themeDarker} 100%) !important`,
                    color: '#ffffff !important',
                    boxShadow: `0 4px 12px ${themeColor}50 !important`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${themeDarker} 0%, ${themeDarkest} 100%) !important`,
                      transform: 'scale(1.05)',
                    },
                    '&.Mui-disabled': {
                      background: `${isDarkMode ? '#334155' : '#e2e8f0'} !important`,
                      color: `${isDarkMode ? '#64748b' : '#94a3b8'} !important`,
                      boxShadow: 'none !important',
                      transform: 'none',
                    },
                  }}
                >
                  {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
                </Button>
              </Box>
            </>
          ) : (
            /* Empty Canvas State */
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                p: 4,
              }}
            >
              <Box
                sx={{
                  width: 90,
                  height: 90,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${themeColor}15 0%, ${themeColor}30 100%)`,
                  color: themeColor,
                  mb: 3,
                  boxShadow: `0 12px 28px ${themeColor}20`,
                }}
              >
                <ForumIcon sx={{ fontSize: 44 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a', mb: 1 }}>
                Select a Colleague to Start Chatting
              </Typography>
              <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', maxWidth: 460, lineHeight: 1.6, mb: 3 }}>
                Choose any administrator, teacher, or staff member from the directory on the left to start private, branch-secure real-time messaging.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip label="🔒 Campus Secure" size="small" sx={{ fontWeight: 600 }} />
                <Chip label="⚡ Real-Time Sync" size="small" sx={{ fontWeight: 600 }} />
                <Chip label="📢 Global Broadcast Notices" size="small" sx={{ fontWeight: 600 }} />
              </Box>
            </Box>
          )}
        </Box>
      </Card>

      {/* Broadcast Modal */}
      <Modal
        open={notifyModalOpen}
        onClose={() => !broadcasting && setNotifyModalOpen(false)}
        title="Broadcast Campus Announcement"
        subtitle="Publish a school-wide instant notice to all teachers, staff, and portals"
        icon={<CampaignIcon sx={{ fontSize: 26 }} />}
        maxWidth="sm"
        onConfirm={handleSendNotification}
        confirmText="Publish Broadcast"
        confirmLoadingText="Broadcasting..."
        loading={broadcasting}
      >
        <Box sx={{ pt: 1 }}>
          <TextField
            required
            fullWidth
            label="Announcement Title"
            placeholder="e.g. Urgent Staff Meeting at 03:00 PM in Conference Hall"
            value={notifyTitle}
            onChange={(e) => setNotifyTitle(e.target.value)}
            sx={{ mb: 2.5 }}
          />
          <TextField
            required
            fullWidth
            multiline
            rows={5}
            label="Notice Description / Body"
            placeholder="Enter the full announcement details and instructions for the school staff..."
            value={notifyMsg}
            onChange={(e) => setNotifyMsg(e.target.value)}
          />
        </Box>
      </Modal>
    </Box>
  );
};

export default CommunicationPage;
