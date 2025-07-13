// Backup del archivo original para referencia
import MicrophoneStream from 'microphone-stream';

let micStream: any | null = null;
let audioContext: AudioContext | null = null;

export const startMicrophone = (onAudioChunkCallback: (chunk: Uint8Array) => void): Promise<MediaStream> => {
  return new Promise((resolve, reject) => {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContext();
    }
    
    // Es crucial reanudar el AudioContext antes de cualquier operación
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(err => console.error("Error al reanudar AudioContext:", err));
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        try {
          // Manejo mejorado de la importación de microphone-stream
          micStream = new MicrophoneStream();
          
          micStream.setStream(stream);
          micStream.on('data', (chunk: Buffer) => {
            // La librería emite 'Buffer' en Node, pero en el navegador puede ser diferente.
            // Nos aseguramos de que sea un Uint8Array.
            onAudioChunkCallback(new Uint8Array(chunk));
          });

          resolve(stream);
        } catch (error) {
          console.error("Error al inicializar MicrophoneStream:", error);
          reject(error);
        }
      })
      .catch(err => {
        console.error("Error al acceder al micrófono:", err);
        reject(err);
      });
  });
};

export const stopMicrophone = () => {
  if (micStream) {
    try {
      micStream.stop();
    } catch (error) {
      console.error("Error al detener MicrophoneStream:", error);
    }
    micStream = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(err => console.error("Error al cerrar AudioContext:", err));
    audioContext = null;
  }
};
