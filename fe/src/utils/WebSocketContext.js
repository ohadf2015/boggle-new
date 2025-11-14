import { createContext, useContext } from 'react';

export const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const ws = useContext(WebSocketContext);
  if (!ws) {
    console.warn('useWebSocket must be used within a WebSocketContext.Provider');
  }
  return ws;
};