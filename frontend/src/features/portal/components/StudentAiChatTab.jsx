import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
  Avatar,
  Stack,
  CircularProgress,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import { portalApi } from '../api';

export const StudentAiChatTab = ({ student, isDarkMode, primaryColor }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Hello ${student?.fullName || 'Student'}! 👋 I am your Free AI Study Buddy. Ask me any doubts from Science, Maths, Social Studies, English, or your school homework!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    { label: 'Explain Photosynthesis', icon: <LightbulbOutlinedIcon fontSize="small" />, prompt: 'Explain the process of Photosynthesis in simple points suitable for school students.' },
    { label: 'Pythagoras Theorem', icon: <CalculateOutlinedIcon fontSize="small" />, prompt: 'What is Pythagoras theorem and give an easy example to solve it?' },
    { label: 'Grammar: Active & Passive Voice', icon: <TranslateIcon fontSize="small" />, prompt: 'Explain Active and Passive voice with 3 simple examples.' },
    { label: 'Tips for Exam Preparation', icon: <HelpOutlineIcon fontSize="small" />, prompt: 'What are the top 5 revision and study habits for scoring well in school exams?' },
  ];

  const handleSend = async (customPrompt) => {
    const userQuery = customPrompt || input.trim();
    if (!userQuery || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userQuery,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const studentClass = student?.className ? `Class ${student.className}` : 'school student';
      const systemInstruction = `You are an encouraging, polite, and educational AI Study Tutor for a ${studentClass}. Give clear, concise, step-by-step answers that are easy to understand for school children. Use bullet points and simple language. Keep explanations educational, accurate, and safe.`;

      let replyText = '';

      // Try 1: Call through backend portal proxy endpoint (No CORS, reliable)
      try {
        const res = await portalApi.askAi({
          message: userQuery,
          systemPrompt: systemInstruction
        });
        if (res.data?.success && res.data?.data) {
          replyText = res.data.data;
        }
      } catch (backendErr) {
        console.warn('Backend AI proxy failed, attempting direct fallback...', backendErr);
      }

      // Try 2: Direct browser POST fallback if backend proxy was unavailable
      if (!replyText) {
        const fallbackRes = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userQuery }
            ],
            model: 'openai',
            seed: 42
          })
        });

        if (fallbackRes.ok) {
          replyText = await fallbackRes.text();
        }
      }

      if (!replyText) {
        throw new Error('No response from AI services');
      }

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI chat error:', err);
      const fallbackMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `⚠️ I'm currently unable to connect to the study tutor network. Please try asking again in a few moments!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: `Chat cleared! How can I help you with your studies today, ${student?.fullName || 'friend'}?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const formatText = (text) => {
    // Render simple markdown bold, linebreaks, bullet points
    return text.split('\n').map((line, idx) => {
      let formatted = line;
      // Bold text replacement
      const parts = formatted.split(/(\*\*.*?\*\*)/g);
      return (
        <Typography
          key={idx}
          variant="body2"
          component="div"
          sx={{
            mb: line === '' ? 1 : 0.4,
            lineHeight: 1.6,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}
        >
          {parts.map((p, pIdx) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return <strong key={pIdx}>{p.slice(2, -2)}</strong>;
            }
            return p;
          })}
        </Typography>
      );
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 270px)', minHeight: 520 }}>
      {/* Top Header Card */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          borderRadius: '12px 12px 0 0',
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: `${primaryColor}20`, color: primaryColor }}>
            <SmartToyIcon />
          </Avatar>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1" fontWeight={800} color={isDarkMode ? '#f8fafc' : '#0f172a'}>
                AI Study Buddy (24/7 Doubt Solver)
              </Typography>
              <Chip
                label="Free • Powered by AI"
                size="small"
                sx={{
                  bgcolor: '#10b98115',
                  color: '#10b981',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 20
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Personalized for {student?.className ? `Class ${student.className}` : 'School Studies'} • Instant Homework & Concept Assistance
            </Typography>
          </Box>
        </Stack>

        <Tooltip title="Clear Chat History">
          <IconButton size="small" onClick={handleClearChat} sx={{ color: 'text.secondary' }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Quick Prompts Bar */}
      <Box
        sx={{
          py: 1,
          px: 2,
          bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9',
          borderLeft: '1px solid',
          borderRight: '1px solid',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 }
        }}
      >
        <Typography variant="caption" sx={{ alignSelf: 'center', fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          💡 Try Asking:
        </Typography>
        {quickPrompts.map((qp, index) => (
          <Chip
            key={index}
            icon={qp.icon}
            label={qp.label}
            size="small"
            clickable
            disabled={loading}
            onClick={() => handleSend(qp.prompt)}
            sx={{
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
              border: '1px solid',
              borderColor: isDarkMode ? '#334155' : '#cbd5e1',
              fontWeight: 600,
              fontSize: '0.75rem',
              '&:hover': { bgcolor: `${primaryColor}15`, borderColor: primaryColor }
            }}
          />
        ))}
      </Box>

      {/* Chat Messages Scroll Area */}
      <Box
        sx={{
          flex: 1,
          p: 2.5,
          overflowY: 'auto',
          bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
          borderLeft: '1px solid',
          borderRight: '1px solid',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: 1.5,
                maxWidth: '100%',
              }}
            >
              {!isUser && (
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: primaryColor,
                    color: '#fff',
                    mt: 0.5
                  }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 18 }} />
                </Avatar>
              )}

              <Box sx={{ maxWidth: { xs: '85%', sm: '75%' } }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.8,
                    borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    bgcolor: isUser ? primaryColor : (isDarkMode ? '#1e293b' : '#ffffff'),
                    color: isUser ? '#ffffff' : (isDarkMode ? '#f1f5f9' : '#1e293b'),
                    border: isUser ? 'none' : `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                  }}
                >
                  {formatText(msg.text)}
                </Paper>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.3,
                    px: 0.5,
                    fontSize: '0.68rem',
                    color: 'text.secondary',
                    textAlign: isUser ? 'right' : 'left'
                  }}
                >
                  {msg.time}
                </Typography>
              </Box>

              {isUser && (
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: '#64748b',
                    color: '#fff',
                    mt: 0.5
                  }}
                >
                  <PersonIcon sx={{ fontSize: 18 }} />
                </Avatar>
              )}
            </Box>
          );
        })}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 0.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: primaryColor, color: '#fff' }}>
              <AutoAwesomeIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: '16px 16px 16px 2px',
                bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <CircularProgress size={16} sx={{ color: primaryColor }} />
              <Typography variant="body2" color="text.secondary">
                Tutor is thinking & writing explanation...
              </Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Bar */}
      <Paper
        elevation={0}
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        sx={{
          p: 1.5,
          border: '1px solid',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          borderRadius: '0 0 12px 12px',
          bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask a question or homework doubt (e.g., 'Explain Newton's third law with example')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoComplete="off"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: isDarkMode ? '#0f172a' : '#f8fafc',
            }
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !input.trim()}
          sx={{
            bgcolor: primaryColor,
            px: 2.5,
            py: 1,
            borderRadius: 2,
            minWidth: 48,
            boxShadow: 'none',
            '&:hover': { bgcolor: primaryColor, opacity: 0.9 }
          }}
        >
          <SendIcon fontSize="small" />
        </Button>
      </Paper>
    </Box>
  );
};
