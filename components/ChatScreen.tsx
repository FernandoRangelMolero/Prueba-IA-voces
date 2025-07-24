import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatConfig, ChatMessage, MessageSender } from '../types';
import * as agoraVoiceService from '../services/agoraVoiceService';
import * as audioOutputService from '../services/audioOutputService';
import AIIcon from './icons/AIIcon';
import UserIcon from './icons/UserIcon';

interface ChatScreenProps {
  config: ChatConfig;
  onExit: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ config, onExit }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [aiTranscript, setAiTranscript] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);

  const handleAgoraMessage = useCallback((data: any) => {
    if (data.type === 'audio') {
        setIsAiSpeaking(true);
        audioOutputService.playAudioChunk(data.audio_chunk);
    } else if (data.type === 'transcript') {
        setAiTranscript(data.text);
    } else if (data.type === 'audio_end') {
        setIsAiSpeaking(false);
        setAiTranscript(prev => {
            if(prev) {
                const aiMessage: ChatMessage = {
                    id: `ai-${Date.now()}`,
                    sender: MessageSender.AI,
                    text: prev,
                };
                setMessages(currentMessages => [...currentMessages, aiMessage]);
                return '';
            }
            return prev;
        });
    }
  }, []);

  useEffect(() => {
    setConnectionStatus('connecting');
    agoraVoiceService.connect(config, handleAgoraMessage)
        .then(() => setConnectionStatus('connected'))
        .catch(() => setConnectionStatus('error'));

    audioOutputService.initializeAudio();

    return () => {
      agoraVoiceService.disconnect();
    };
  }, [config]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTranscript]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 shadow-md">
        <h1 className="text-xl font-bold">Live Voice Session</h1>
         <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <p className="capitalize">{connectionStatus}</p>
        </div>
        <button
          onClick={onExit}
          className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          End Session
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === MessageSender.USER ? 'justify-end' : ''}`}>
             {msg.sender === MessageSender.AI && <div className="p-2 bg-indigo-600 rounded-full"><AIIcon className="w-6 h-6 text-white"/></div>}
            <div className={`max-w-xl p-4 rounded-2xl ${msg.sender === MessageSender.AI ? 'bg-gray-700 rounded-bl-lg' : 'bg-blue-600 text-white rounded-br-lg'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
             {msg.sender === MessageSender.USER && <div className="p-2 bg-blue-600 rounded-full"><UserIcon className="w-6 h-6 text-white"/></div>}
          </div>
        ))}
         {isAiSpeaking && (
            <div className="flex items-start gap-4">
                 <div className="p-2 bg-indigo-600 rounded-full"><AIIcon className="w-6 h-6 text-white"/></div>
                <div className="max-w-xl p-4 rounded-2xl bg-gray-700 rounded-bl-lg">
                    <p className="whitespace-pre-wrap">{aiTranscript || "..."}</p>
                </div>
            </div>
        )}
        <div ref={messageEndRef} />
      </main>

      <footer className="p-4 bg-gray-800 border-t border-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-green-400 mb-1">
            🎤 Voice Call Active
          </div>
          <p className="text-sm text-gray-400">
            Speak naturally - your voice is being transmitted in real-time
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ChatScreen;