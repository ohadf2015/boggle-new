import { createContext, useContext } from "react";


export const WebSocketContext = createContext(null);

export function useWebSocket() {
  return useContext(WebSocketContext);
}