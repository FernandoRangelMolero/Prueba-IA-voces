import { ChatConfig } from '../types';
import MicrophoneStream from 'microphone-stream';

let ws: WebSocket | null = null;
let micStream: MicrophoneStream | null = null;

export const connect = (
  config: ChatConfig,
  onMessageCallback: (data: any) => void
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const wsUrl = `ws://${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      console.log('WebSocket connected');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream = new MicrophoneStream({
            stream,
            objectMode: true,
            bufferSize: 1024
        });

        micStream.on('data', (chunk) => {
            const raw = MicrophoneStream.toRaw(chunk);
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'audio', audio_chunk: raw.buffer }));
            }
        });

        resolve();
      } catch (error) {
        console.error('Error getting media devices.', error);
        reject(error);
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessageCallback(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
  });
};

export const disconnect = () => {
  if (micStream) {
    micStream.stop();
    micStream = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
};
