
import React, { useState, useCallback } from 'react';
import { AppState, ChatConfig } from './types';
import SetupScreen from './components/SetupScreen_Enhanced';
import ChatScreen from './components/ChatScreen';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null);

  const handleStartChat = useCallback((config: ChatConfig) => {
    setChatConfig(config);
    setAppState(AppState.CHATTING);
  }, []);
  
  const handleExitChat = useCallback(() => {
      setChatConfig(null);
      setAppState(AppState.SETUP);
  }, []);

  switch (appState) {
    case AppState.SETUP:
      return <SetupScreen onStartChat={handleStartChat} />;
    case AppState.CHATTING:
      if (!chatConfig) {
        // Fallback in case state is inconsistent
        setAppState(AppState.SETUP);
        return null;
      }
      return <ChatScreen config={chatConfig} onExit={handleExitChat} />;
    default:
      return <SetupScreen onStartChat={handleStartChat} />;
  }
};

export default App;
