// Servicio simplificado para audio input que funciona con WebRTC
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;

export const startMicrophone = (onAudioChunkCallback?: (chunk: Uint8Array) => void): Promise<MediaStream> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContext({
          sampleRate: 24000 // OpenAI Realtime prefiere 24kHz
        });
      }
      
      // Es crucial reanudar el AudioContext antes de cualquier operación
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log("AudioContext resumed");
      }

      // Obtener stream de audio
      mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      console.log("Microphone stream obtained successfully");
      
      // Si se proporciona callback, procesar el audio
      if (onAudioChunkCallback && audioContext) {
        const source = audioContext.createMediaStreamSource(mediaStream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Convertir Float32Array a PCM16
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }
          
          // Convertir a Uint8Array
          const uint8Array = new Uint8Array(pcm16.buffer);
          onAudioChunkCallback(uint8Array);
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        console.log("Audio processing pipeline set up");
      }

      resolve(mediaStream);
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      reject(error);
    }
  });
};

export const stopMicrophone = () => {
  if (mediaStream) {
    try {
      mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped audio track");
      });
    } catch (error) {
      console.error("Error al detener MediaStream:", error);
    }
    mediaStream = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(err => console.error("Error al cerrar AudioContext:", err));
    audioContext = null;
  }
  
  console.log("Microphone stopped and cleaned up");
};