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
  Stack,
  Divider,
} from '@mui/material';

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

  return (
    <>
      {/* Status Card */}
      <Card
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          minWidth: 250,
          backgroundColor: '#121212',
          color: 'white',
          zIndex: 9999,
          boxShadow: 5,
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom>
            WebSocket Status
          </Typography>
          <Stack spacing={1}>
            <Chip
              label={status}
              color={
                status.includes('Connected')
                  ? 'success'
                  : status.includes('Reconnecting')
                  ? 'warning'
                  : 'error'
              }
              variant="outlined"
            />
            <Typography variant="body2">
              Messages Received: <strong>{messageCount}</strong>
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Latest Message Card */}
      <Card
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          maxWidth: 500,
          backgroundColor: '#1e1e1e',
          color: '#f5f5f5',
          zIndex: 9999,
          boxShadow: 5,
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Latest Message
          </Typography>
          <Divider sx={{ mb: 1, borderColor: '#555' }} />
          <Typography variant="body2" sx={{ color: '#ccc', whiteSpace: 'pre-wrap' }}>
            {latestMessage || 'No messages received yet.'}
          </Typography>
          {latestMessage && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#999' }}>
              ⏱️ Received at: {timestamp}
            </Typography>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default WebSocketListener;
