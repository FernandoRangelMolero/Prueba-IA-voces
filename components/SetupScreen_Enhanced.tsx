import React, { useState, useCallback, useEffect } from 'react';
import { ChatConfig, VoiceOption, ExampleConfig } from '../types';
import { VOICE_OPTIONS, DEFAULT_EXAMPLES } from '../constants';

interface SetupScreenProps {
  onStartChat: (config: ChatConfig) => void;
}

const MAX_CONTEXT_TOKENS = 120000;
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

const SetupScreen: React.FC<SetupScreenProps> = ({ onStartChat }) => {
  const [mode, setMode] = useState<'select' | 'example' | 'custom'>('select');
  
  // Estados para modo personalizado
  const [userInstructions, setUserInstructions] = useState('');
  const [documentContext, setDocumentContext] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICE_OPTIONS[0]);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [supportedTypes, setSupportedTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    const combinedText = [
      selectedVoice.instruction,
      userInstructions,
      documentContext,
    ].join(' ');
    setTokenCount(estimateTokens(combinedText));
  }, [userInstructions, documentContext, selectedVoice]);

  // Cargar tipos de archivo soportados
  useEffect(() => {
    fetch('http://localhost:3001/supported-file-types')
      .then(res => res.json())
      .then(types => setSupportedTypes(types))
      .catch(err => console.error('Error cargando tipos de archivo:', err));
  }, []);

  const handleExampleSelect = async (example: ExampleConfig) => {
    setIsLoading(true);
    setError('');

    try {
      // Cargar el documento del ejemplo
      const response = await fetch(example.documentPath);
      if (!response.ok) {
        throw new Error('No se pudo cargar el documento del ejemplo');
      }
      const documentText = await response.text();
      
      // Configurar el ejemplo
      const config: ChatConfig = {
        voiceInstruction: example.voiceInstruction,
        userInstructions: example.userInstructions,
        documentContext: documentText,
      };

      console.log('🚀 Starting chat with example:', example.title);
      onStartChat(config);
    } catch (error) {
      console.error('Error loading example:', error);
      setError('Error al cargar el ejemplo. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch('http://localhost:3001/process-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error processing document');
      }

      const result = await response.json();
      setDocumentContext(result.text);
      console.log(`📄 Document processed: ${result.wordCount} words, ${result.characterCount} characters`);
    } catch (error) {
      console.error('Error processing document:', error);
      setError(error instanceof Error ? error.message : 'Error processing document');
      setFileName('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCustomStart = () => {
    if (!selectedVoice) {
      setError('Please select a voice option');
      return;
    }
    if (tokenCount > MAX_CONTEXT_TOKENS) {
      setError(`Content too long. Please reduce to under ${MAX_CONTEXT_TOKENS.toLocaleString()} tokens.`);
      return;
    }
    
    const config: ChatConfig = {
      voiceInstruction: selectedVoice.instruction,
      userInstructions,
      documentContext,
    };

    console.log('🚀 Starting chat with custom config:', config);
    onStartChat(config);
  };

  const progressPercentage = Math.min((tokenCount / MAX_CONTEXT_TOKENS) * 100, 100);
  const progressBarColor = progressPercentage > 90 ? 'bg-red-500' : progressPercentage > 70 ? 'bg-yellow-400' : 'bg-green-500';
  const acceptedTypes = Object.keys(supportedTypes).join(',') + ',.txt';

  // Pantalla de selección inicial
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              🎯 AI Voice Assistant
            </h1>
            <p className="text-xl text-gray-300">
              Elige cómo quieres comenzar
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Usar Ejemplo */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 hover:bg-white/20 transition-all duration-300 cursor-pointer border border-white/20"
                 onClick={() => setMode('example')}>
              <div className="text-center">
                <div className="text-6xl mb-6">🚀</div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Usar Ejemplo Pre-configurado
                </h2>
                <p className="text-gray-300 mb-6">
                  Prueba inmediatamente con un asistente ya entrenado y listo para usar
                </p>
                <div className="bg-blue-500/20 rounded-lg p-4 mb-4">
                  <p className="text-blue-200 text-sm">
                    ✨ Perfecto para probar rápidamente las capacidades del sistema
                  </p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                  Ver Ejemplos
                </button>
              </div>
            </div>

            {/* Crear Personalizado */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 hover:bg-white/20 transition-all duration-300 cursor-pointer border border-white/20"
                 onClick={() => setMode('custom')}>
              <div className="text-center">
                <div className="text-6xl mb-6">⚙️</div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Crear Configuración Personalizada
                </h2>
                <p className="text-gray-300 mb-6">
                  Diseña tu propio asistente con documentos e instrucciones específicas
                </p>
                <div className="bg-purple-500/20 rounded-lg p-4 mb-4">
                  <p className="text-purple-200 text-sm">
                    🎨 Personaliza completamente el comportamiento y conocimiento
                  </p>
                </div>
                <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                  Empezar Configuración
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Ambas opciones te permitirán crear un asistente de voz inteligente
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de ejemplos
  if (mode === 'example') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <button 
              onClick={() => setMode('select')}
              className="mb-4 text-gray-300 hover:text-white transition-colors inline-flex items-center"
            >
              ← Volver a opciones
            </button>
            <h1 className="text-4xl font-bold text-white mb-4">
              📚 Ejemplos Pre-configurados
            </h1>
            <p className="text-xl text-gray-300">
              Selecciona un ejemplo para empezar inmediatamente
            </p>
          </div>

          {/* Examples */}
          <div className="space-y-6">
            {DEFAULT_EXAMPLES.map((example) => (
              <div 
                key={example.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer border border-white/20"
                onClick={() => handleExampleSelect(example)}
              >
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{example.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {example.title}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      {example.description}
                    </p>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-400 text-sm">
                        <strong>Características:</strong> Documento de empresa incluido, 
                        instrucciones específicas, optimizado para consultas comerciales
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-white text-lg">Cargando ejemplo...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Pantalla de configuración personalizada
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => setMode('select')}
            className="mb-4 text-gray-300 hover:text-white transition-colors inline-flex items-center"
          >
            ← Volver a opciones
          </button>
          <h1 className="text-4xl font-bold text-white mb-4">
            ⚙️ Configuración Personalizada
          </h1>
          <p className="text-xl text-gray-300">
            Diseña tu asistente de voz perfecto
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          {/* Voice Selection */}
          <div className="mb-8">
            <label className="block text-white text-lg font-semibold mb-4">
              🎭 Personalidad del Asistente
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              {VOICE_OPTIONS.map((voice) => (
                <div
                  key={voice.id}
                  className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    selectedVoice.id === voice.id
                      ? 'bg-purple-600/30 border-purple-500'
                      : 'bg-white/5 border-gray-600 hover:bg-white/10'
                  }`}
                  onClick={() => setSelectedVoice(voice)}
                >
                  <h3 className="text-white font-semibold mb-2">{voice.name}</h3>
                  <p className="text-gray-300 text-sm">{voice.instruction}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Document Upload */}
          <div className="mb-8">
            <label className="block text-white text-lg font-semibold mb-4">
              📄 Documento de Contexto (Opcional)
            </label>
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-gray-500 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept={acceptedTypes}
                className="hidden"
                id="document-upload"
                disabled={isLoading}
              />
              <label
                htmlFor="document-upload"
                className="cursor-pointer block"
              >
                <div className="text-4xl mb-4">📁</div>
                <p className="text-gray-300 mb-2">
                  {fileName || 'Selecciona un documento para dar contexto a tu asistente'}
                </p>
                <p className="text-gray-500 text-sm">
                  Formatos soportados: {Object.values(supportedTypes).join(', ')}, TXT
                </p>
              </label>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="mb-8">
            <label className="block text-white text-lg font-semibold mb-4">
              📝 Instrucciones Específicas (Opcional)
            </label>
            <textarea
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.target.value)}
              placeholder="Añade instrucciones específicas sobre cómo debe comportarse tu asistente..."
              className="w-full h-32 p-4 bg-white/10 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Token Counter */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold">Uso de contexto</span>
              <span className="text-gray-300">
                {tokenCount.toLocaleString()} / {MAX_CONTEXT_TOKENS.toLocaleString()} tokens
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${progressBarColor}`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>
            <button
              onClick={handleCustomStart}
              disabled={isLoading || tokenCount > MAX_CONTEXT_TOKENS}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Iniciar Chat</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
