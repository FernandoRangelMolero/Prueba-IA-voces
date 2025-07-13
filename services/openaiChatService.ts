import { ChatConfig } from '../types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Configuración de OpenAI
const OPENAI_API_KEY = (import.meta as any).env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Estado de la conversación
let messages: Message[] = [];
let connectionState = false;

export const connect = async (
  config: ChatConfig,
  onMessageCallback: (data: any) => void
): Promise<void> => {
  try {
    console.log('🔗 Connecting to OpenAI Chat API...');
    
    // Reiniciar mensajes
    messages = [];
    
    // Configurar mensaje del sistema
    const systemMessage: Message = {
      role: 'system',
      content: `${config.voiceInstruction}

${config.userInstructions || ''}

Contexto del documento:
${config.documentContext || ''}

Instrucciones adicionales:
- Responde de manera conversacional como si fuera una llamada de voz
- Sé conciso pero informativo
- Mantén el tono apropiado para el tipo de asistente
- Si necesitas información específica, pregunta de manera clara`
    };
    
    messages.push(systemMessage);
    connectionState = true;
    
    console.log('✅ Connected to OpenAI Chat API');
    
    // Simular mensaje de conexión exitosa
    onMessageCallback({
      type: 'conversation.created'
    });
    
  } catch (error) {
    console.error('❌ Error connecting to OpenAI:', error);
    throw error;
  }
};

export const disconnect = (): void => {
  console.log('📡 Disconnecting from OpenAI Chat API...');
  messages = [];
  connectionState = false;
  console.log('✅ Disconnected from OpenAI Chat API');
};

export const sendMessage = async (
  text: string,
  onMessageCallback: (data: any) => void
): Promise<void> => {
  if (!connectionState) {
    throw new Error('Not connected to OpenAI');
  }

  try {
    console.log('📤 Sending message to OpenAI:', text);
    
    // Agregar mensaje del usuario
    const userMessage: Message = {
      role: 'user',
      content: text
    };
    messages.push(userMessage);
    
    // Llamar a la API de OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;
    
    // Agregar respuesta del asistente
    const assistantMessageObj: Message = {
      role: 'assistant',
      content: assistantMessage
    };
    messages.push(assistantMessageObj);
    
    console.log('📥 Received response from OpenAI:', assistantMessage);
    
    // Llamar al callback con la respuesta
    onMessageCallback({
      type: 'response.text.delta',
      delta: assistantMessage
    });
    
    onMessageCallback({
      type: 'response.text.done'
    });
    
  } catch (error) {
    console.error('❌ Error sending message to OpenAI:', error);
    onMessageCallback({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Función auxiliar para obtener el estado de conexión
export const getConnectionState = (): boolean => {
  return connectionState;
};
