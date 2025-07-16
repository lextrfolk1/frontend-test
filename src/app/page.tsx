'use client';

import { useState,useCallback } from 'react';
import WebSocketListener from '@/components/WebSocketListener';

export default function Home() {
  const [showPanel, setShowPanel] = useState(false);
  const [responseHtml, setResponseHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081/proxy/api';
  
  const handleWebSocketMessage = useCallback((payload:any) => {},[]);


  const callApi = async (endpoint: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/${endpoint}`);
      const data = await res.text();
      setResponseHtml(data);
      setShowPanel(true);
    } catch (error) {
      setResponseHtml('<p style="color:red;">Error calling API</p>');
      setShowPanel(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <WebSocketListener
        topic="/topic/messages"
        onMessage={handleWebSocketMessage}
      />
      <h1 style={styles.heading}>API GATEWAY TESTING</h1>

      <div style={styles.buttonGroup}>
        <button
          onClick={() => callApi('test')}
          style={{ ...styles.button, backgroundColor: '#2563eb' }}
        >
          {loading ? 'Loading...' : 'Call Hello World'}
        </button>

        <button
          onClick={() => callApi('test/health')}
          style={{ ...styles.button, backgroundColor: '#16a34a' }}
        >
          {loading ? 'Loading...' : 'Call Health'}
        </button>
      </div>

      <div
        style={{
          ...styles.responsePanel,
          maxHeight: showPanel ? '500px' : '0',
          padding: showPanel ? '16px' : '0 16px',
        }}
      >
        <div
          style={styles.responseContent}
          dangerouslySetInnerHTML={{ __html: responseHtml || '' }}
        />
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  heading: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '24px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    color: 'white',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  responsePanel: {
    backgroundColor: 'white',
    overflow: 'hidden',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '700px',
    transition: 'all 0.4s ease',
  },
  responseContent: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#1f2937',
  },
};
