import React, { useState, useCallback, useEffect } from 'react';
import { ChatConfig, VoiceOption } from '../types';
import { VOICE_OPTIONS } from '../constants';
import UploadIcon from './icons/UploadIcon';

interface SetupScreenProps {
  onStartChat: (config: ChatConfig) => void;
}

const MAX_CONTEXT_TOKENS = 120000;

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

const SetupScreen: React.FC<SetupScreenProps> = ({ onStartChat }) => {
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

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');
    setFileName(file.name);

    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('document', file);
      
      // Enviar al endpoint de procesamiento de documentos
      const response = await fetch('http://localhost:3001/process-document', {
          method: 'POST',
          body: formData
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error procesando el documento');
      }

      const data = await response.json();
      
      // Agregar información del documento al contexto
      const documentInfo = `Documento: ${data.filename}\n`;
      const documentStats = `(${data.wordCount} palabras, ${data.characterCount} caracteres)\n\n`;
      const fullContext = documentInfo + documentStats + data.text;
      
      setDocumentContext(fullContext);
      console.log('Documento procesado exitosamente:', data.filename);
      
    } catch (error) {
      console.error('Error procesando documento:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido procesando el documento');
      setFileName('');
      setDocumentContext('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStart = () => {
    if (!selectedVoice) {
      setError('Please select a voice.');
      return;
    }
    if (tokenCount > MAX_CONTEXT_TOKENS) {
      setError(`Token limit exceeded. Please shorten your context. (${tokenCount}/${MAX_CONTEXT_TOKENS})`);
      return;
    }
    
    const config = {
      voiceInstruction: selectedVoice.instruction,
      userInstructions,
      documentContext,
    };
    
    console.log('🚀 Starting chat with config:', {
      voiceInstruction: config.voiceInstruction.substring(0, 100) + '...',
      userInstructions: config.userInstructions.substring(0, 100) + '...',
      documentContext: config.documentContext ? config.documentContext.substring(0, 200) + '...' : 'No document',
      documentContextLength: config.documentContext.length
    });
    
    onStartChat(config);
  };

  const progressPercentage = Math.min((tokenCount / MAX_CONTEXT_TOKENS) * 100, 100);
  const progressBarColor = progressPercentage > 90 ? 'bg-red-500' : progressPercentage > 70 ? 'bg-yellow-400' : 'bg-green-500';

  // Crear la lista de tipos de archivo aceptados
  const acceptedTypes = Object.keys(supportedTypes).join(',') + ',.txt';

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-8 border border-gray-700">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">AI Voice Trainer</h1>
          <p className="text-gray-400 mt-2">Configure your AI assistant to start a conversation.</p>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">{error}</div>}

        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-lg font-semibold text-gray-300 mb-2">1. Upload Document (Optional)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md hover:border-indigo-500 transition-colors">
              <div className="space-y-1 text-center">
                <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                <div className="flex text-sm text-gray-400">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-indigo-500">
                    <span>Upload a document</span>
                    <input 
                      id="file-upload" 
                      name="file-upload" 
                      type="file" 
                      className="sr-only" 
                      onChange={handleFileChange} 
                      accept={acceptedTypes}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  {Object.values(supportedTypes).join(', ') || 'PDF, Word, Text files'} up to 10MB
                </p>
              </div>
            </div>
            {fileName && !isLoading && <p className="text-sm text-green-400 mt-2">Document loaded: {fileName}</p>}
            {isLoading && <p className="text-sm text-blue-400 mt-2">Processing document, please wait...</p>}
          </div>

          {/* Instructions */}
          <div>
            <label htmlFor="instructions" className="block text-lg font-semibold text-gray-300 mb-2">2. Add Instructions</label>
            <textarea
              id="instructions"
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              placeholder="e.g., 'Summarize the document for me', 'Act as a debate opponent', 'Answer questions about the uploaded document'"
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.target.value)}
            />
          </div>

          {/* Voice Selection */}
          <div>
            <label htmlFor="voice" className="block text-lg font-semibold text-gray-300 mb-2">3. Choose a Voice</label>
            <select
              id="voice"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none"
              style={{ background: 'url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E\') no-repeat right 1rem center/10px 10px, linear-gradient(#4A5568, #4A5568)' }}
              value={selectedVoice.id}
              onChange={(e) => setSelectedVoice(VOICE_OPTIONS.find(v => v.id === e.target.value) || VOICE_OPTIONS[0])}
            >
              {VOICE_OPTIONS.map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </div>

          {/* Token Counter */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-300">Context Length</span>
              <span className="text-sm text-gray-400">{tokenCount.toLocaleString()} / {MAX_CONTEXT_TOKENS.toLocaleString()} tokens</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-300 ${progressBarColor}`} style={{ width: `${progressPercentage}%` }}></div>
            </div>
            {progressPercentage > 90 && (
              <p className="text-xs text-red-400 mt-1">Warning: Context is very long and may be truncated.</p>
            )}
          </div>

          {/* Document Context Preview */}
          {documentContext && (
            <div>
              <label className="block text-lg font-semibold text-gray-300 mb-2">Document Context</label>
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{documentContext.substring(0, 500)}{documentContext.length > 500 ? '...' : ''}</p>
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={isLoading || tokenCount > MAX_CONTEXT_TOKENS}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-lg"
          >
            {isLoading ? 'Processing...' : 'Start Voice Chat'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
