export enum AppState {
  SETUP,
  CHATTING,
}

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp?: Date;
}

export interface VoiceOption {
  id: string;
  name: string;
  instruction: string;
}

export interface ExampleConfig {
  id: string;
  title: string;
  description: string;
  documentPath: string;
  voiceInstruction: string;
  userInstructions: string;
  icon: string;
}

export interface ChatConfig {
  voiceInstruction: string;
  userInstructions: string;
  documentContext: string;
  audio?: {
    inputDeviceId?: string;
  };
}
