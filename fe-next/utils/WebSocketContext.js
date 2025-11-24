import { createContext, useContext } from 'react';

export const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const ws = useContext(WebSocketContext);
  if (!ws) {
    throw new Error('useWebSocket must be used within a WebSocketContext.Provider. Make sure your component is wrapped with a WebSocketContext.Provider.');
  }
  return ws;
};

// Optional hook for cases where WebSocket might not be available yet
export const useWebSocketOptional = () => {
  const ws = useContext(WebSocketContext);
  return ws;
};