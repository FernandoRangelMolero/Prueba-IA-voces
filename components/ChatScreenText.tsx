import React, { useState, useEffect, useRef } from 'react';
import { ChatConfig, ChatMessage, MessageSender } from '../types';
import * as openaiChatService from '../services/openaiChatService';
import AIIcon from './icons/AIIcon';
import UserIcon from './icons/UserIcon';
import SendIcon from './icons/SendIcon';

interface ChatScreenProps {
  config: ChatConfig;
  onBack: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ config, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Manejar mensajes del servicio OpenAI
  const handleServiceMessage = (data: any) => {
    console.log('📥 Received from OpenAI service:', data);
    
    if (data.type === 'conversation.created') {
      setIsConnected(true);
      // Mensaje de bienvenida
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        text: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date(),
        sender: MessageSender.AI,
      };
      setMessages([welcomeMessage]);
    } else if (data.type === 'response.text.delta') {
      // Agregar respuesta del asistente
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        text: data.delta,
        timestamp: new Date(),
        sender: MessageSender.AI,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    } else if (data.type === 'response.text.done') {
      setIsLoading(false);
    } else if (data.type === 'error') {
      console.error('❌ OpenAI service error:', data.error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `Error: ${data.error}`,
        timestamp: new Date(),
        sender: MessageSender.AI,
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // Conectar al servicio OpenAI al montar el componente
  useEffect(() => {
    console.log('🔗 Connecting to OpenAI service...');
    openaiChatService.connect(config, handleServiceMessage)
      .then(() => {
        console.log('✅ Connected to OpenAI service');
      })
      .catch((error) => {
        console.error('❌ Failed to connect to OpenAI service:', error);
      });

    // Cleanup al desmontar
    return () => {
      if (isConnected) {
        openaiChatService.disconnect();
      }
    };
  }, [config]);

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || !isConnected) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      timestamp: new Date(),
      sender: MessageSender.USER,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      await openaiChatService.sendMessage(userMessage.text, handleServiceMessage);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setIsLoading(false);
    }
  };

  // Manejar Enter para enviar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="text-gray-300 hover:text-white transition-colors"
          >
            ← Volver
          </button>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <h1 className="text-xl font-bold text-white">Chat con Asistente</h1>
          </div>
          <div></div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === MessageSender.USER ? 'justify-end' : ''}`}>
            {msg.sender === MessageSender.AI && (
              <div className="p-2 bg-indigo-600 rounded-full">
                <AIIcon className="w-6 h-6 text-white"/>
              </div>
            )}
            <div className={`max-w-xl p-4 rounded-2xl ${
              msg.sender === MessageSender.AI 
                ? 'bg-gray-700 text-white rounded-bl-lg' 
                : 'bg-blue-600 text-white rounded-br-lg'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <p className="text-xs opacity-70 mt-2">
                {msg.timestamp ? msg.timestamp.toLocaleTimeString() : ''}
              </p>
            </div>
            {msg.sender === MessageSender.USER && (
              <div className="p-2 bg-blue-600 rounded-full">
                <UserIcon className="w-6 h-6 text-white"/>
              </div>
            )}
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-600 rounded-full">
              <AIIcon className="w-6 h-6 text-white"/>
            </div>
            <div className="max-w-xl p-4 rounded-2xl bg-gray-700 text-white rounded-bl-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-black/20 backdrop-blur-lg border-t border-white/10 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje aquí..."
              className="w-full p-4 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none max-h-32"
              rows={1}
              disabled={!isConnected || isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading || !isConnected}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            <SendIcon className="w-6 h-6 text-white" />
          </button>
        </div>
        {!isConnected && (
          <p className="text-center text-gray-400 text-sm mt-2">
            Conectando con el asistente...
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatScreen;
