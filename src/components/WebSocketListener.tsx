'use client';

import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
  Stack,
  useTheme,
  Slide,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface WebSocketListenerProps {
  topic: string;
  onMessage: (payload: any) => void;
  socketPath?: string;
  reconnectDelayMs?: number;
  heartbeatMs?: number;
}

const WebSocketListener = ({
  topic,
  onMessage,
  socketPath = 'http://localhost:8081/proxy/ws/websocket-endpoint',
  reconnectDelayMs = 5000,
  heartbeatMs = 10000,
}: WebSocketListenerProps) => {
  const stompClientRef = useRef<Client | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMessageRef = useRef(onMessage);

  const [status, setStatus] = useState('🔴 Disconnected');
  const [latestMessage, setLatestMessage] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  const [visible, setVisible] = useState(true);

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const scheduleReconnect = () => {
      if (reconnectTimeoutRef.current) return;

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        setStatus('🟡 Reconnecting...');
        stompClientRef.current?.deactivate();
        stompClientRef.current?.activate();
      }, reconnectDelayMs);
    };

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(socketPath),
      reconnectDelay: 0,
      heartbeatIncoming: heartbeatMs,
      heartbeatOutgoing: heartbeatMs,

      onConnect: () => {
        setStatus('🟢 Connected');
        stompClient.subscribe(topic, (message: IMessage) => {
          const payload = message.body;
          const now = new Date().toLocaleString();

          setLatestMessage(payload);
          setTimestamp(now);
          setMessageCount((prev) => prev + 1);
          onMessageRef.current?.(payload);
        });
      },

      onWebSocketClose: () => {
        setStatus('🔴 Disconnected');
        scheduleReconnect();
      },

      onWebSocketError: (error) => {
        setStatus('🔴 WebSocket Error');
        console.error('WebSocket error:', error);
        scheduleReconnect();
      },

      onStompError: (frame) => {
        setStatus('🔴 STOMP Error');
        console.error('STOMP error:', frame);
        scheduleReconnect();
      },
    });

    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      stompClient.deactivate();
    };
  }, [topic, socketPath, reconnectDelayMs, heartbeatMs]);

  const statusColor = status.includes('Connected')
    ? 'success'
    : status.includes('Reconnecting')
    ? 'warning'
    : 'error';

  if (!visible) return null;

  return (
    <Slide direction="down" in={visible} mountOnEnter unmountOnExit>
      <Box
    sx={{
      position: 'fixed',
      top: 16, // 👈 aligned to top
      right: 16,
      width: isMobile ? '95%' : 480,
      maxHeight: 360,
      overflow: 'hidden',
      zIndex: 1500,
      boxShadow: 8,
      borderRadius: 3,
      bgcolor: isDark ? '#1e1e1e' : '#fff',
      color: theme.palette.text.primary,
    }}
  >
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ pb: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight="bold">
                📡 WebSocket Console
              </Typography>
              <IconButton size="small" onClick={() => setVisible(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
              <Chip
                label={status}
                color={statusColor}
                size="small"
                variant="filled"
                sx={{ fontWeight: 500 }}
              />
              <Typography variant="caption" color="text.secondary">
                Messages: <strong>{messageCount}</strong>
              </Typography>
            </Stack>
          </CardContent>

          <Divider />

          <CardContent
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              backgroundColor: isDark ? '#121212' : '#f9f9f9',
              borderRadius: 2,
            }}
          >
            {latestMessage ? (
              <>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: isDark ? '#ddd' : '#333',
                  }}
                >
                  {latestMessage}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 1, color: 'text.disabled' }}
                >
                  ⏱ Received at: {timestamp}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No messages received yet.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Slide>
  );
};

export default WebSocketListener;
