import { ChatConfig } from '../types';
import apiConfig from '../config.js';

let pc: RTCPeerConnection | null = null;
let dc: RTCDataChannel | null = null;
let remoteAudioStream: MediaStream | null = null;
let localStream: MediaStream | null = null;
let connectionInProgress = false;

export const connect = (
  config: ChatConfig,
  onMessageCallback: (data: any) => void
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    // Variable para rastrear si ya se resolvió la promesa
    let resolved = false;
    let connectionTimeout: NodeJS.Timeout | null = null;

    // Función para limpiar el timeout
    const cleanupTimeout = () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
    };

    try {
      // Prevenir múltiples conexiones simultáneas
      if (connectionInProgress) {
        console.log("Connection already in progress, rejecting new attempt");
        reject(new Error("Connection already in progress"));
        return;
      }

      connectionInProgress = true;

      // Asegurarse de que no hay conexiones previas
      if (pc) {
        console.log("Cerrando conexión previa...");
        disconnect();
      }

      // Agregar timeout para evitar conexiones colgadas (incrementado para documentos grandes)
      connectionTimeout = setTimeout(() => {
        if (!resolved) {
          console.error("Connection timeout after 60 seconds");
          connectionInProgress = false;
          resolved = true;
          if (pc) {
            pc.close();
            pc = null;
          }
          reject(new Error("Connection timeout"));
        }
      }, 60000); // 60 segundos de timeout para permitir documentos grandes

      // Obtener token de sesión
      const tokenResponse = await fetch(`${apiConfig.API_BASE_URL}${apiConfig.endpoints.session}`, { method: 'POST' });
      if (!tokenResponse.ok) {
          throw new Error(`Failed to fetch session token: ${tokenResponse.statusText}`);
      }
      const sessionData = await tokenResponse.json();
      const ephemeralKey = sessionData.client_secret.value;

      // Crear peer connection con configuración optimizada para OpenAI Realtime API
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ],
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 0
      });

      // Configurar event listeners
      pc.onconnectionstatechange = () => {
          if(pc && !resolved){
              console.log("Peer connection state:", pc.connectionState);
              if (pc.connectionState === 'connected') {
                  connectionInProgress = false;
                  resolved = true;
                  cleanupTimeout();
                  resolve();
              }
              if(pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                  connectionInProgress = false;
                  resolved = true;
                  cleanupTimeout();
                  reject(new Error(`Peer connection ${pc.connectionState}`));
              }
          }
      };

      pc.onsignalingstatechange = () => {
        if (pc) {
          console.log("Signaling state changed to:", pc.signalingState);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc) {
          console.log("ICE connection state changed to:", pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed') {
            console.error("ICE connection failed");
          }
        }
      };

      // Configurar audio
      const audioEl = new Audio();
      audioEl.autoplay = true;

      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.track.kind === 'audio') {
          remoteAudioStream = event.streams[0];
          audioEl.srcObject = remoteAudioStream;
        }
      };

      // CONFIGURACIÓN SEGÚN DOCUMENTACIÓN OFICIAL OPENAI REALTIME API
      // IMPORTANTE: El orden de creación determina los mid en el SDP
      console.log('🔧 Creating WebRTC components in correct order...');
      
      // PRIMERO: Crear data channel (será mid:0)
      dc = pc.createDataChannel("oai-events", {
        ordered: true
      });
      console.log('✅ Data channel created');

      // SEGUNDO: Agregar el track de audio (será mid:1)  
      try {
        console.log('🎤 Requesting audio access...');
        localStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 24000,
            sampleSize: 16,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Verificar que el data channel se creó antes de agregar audio
        if (!dc) {
          throw new Error('Data channel not created before adding audio track');
        }
        
        // Agregar el track de audio DESPUÉS del data channel
        localStream.getTracks().forEach(track => {
          console.log('🎵 Adding local track:', track.kind);
          pc?.addTrack(track, localStream!);
        });
        console.log('✅ Audio track added after data channel');
      } catch (audioError) {
        console.warn("No se pudo obtener audio local:", audioError);
        // Continuar sin audio local si no es posible
      }
      
      dc.onmessage = (e) => {
        console.log('Received message via data channel:', e.data);
        try {
          const data = JSON.parse(e.data);
          onMessageCallback(data);
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      };
      
      dc.onopen = () => {
        console.log("Data channel opened");
        // Enviar configuración inicial
        if (config && dc && dc.readyState === 'open') {
          console.log('📋 Building system prompt with config:', {
            voiceInstruction: config.voiceInstruction?.substring(0, 50) + '...',
            userInstructions: config.userInstructions?.substring(0, 50) + '...',
            documentContext: config.documentContext ? config.documentContext.substring(0, 100) + '...' : 'NO DOCUMENT',
            documentContextLength: config.documentContext?.length || 0
          });
          
          // Construir el system prompt completo
          let systemPrompt = config.voiceInstruction || "You are a helpful AI assistant.";
          
          // Agregar instrucciones del usuario si existen
          if (config.userInstructions && config.userInstructions.trim()) {
            systemPrompt += `\n\nInstrucciones adicionales del usuario:\n${config.userInstructions}`;
            console.log('✅ Added user instructions to system prompt');
          }
          
          // Agregar contexto del documento si existe
          if (config.documentContext && config.documentContext.trim()) {
            let documentContext = config.documentContext;
            
            // Para documentos muy grandes, usar solo los primeros 20KB para evitar problemas de setup
            if (documentContext.length > 20000) {
              console.log('⚠️ Large document detected, truncating for stability...');
              documentContext = documentContext.substring(0, 20000) + '\n\n[Documento truncado para optimizar la conexión de voz. El contenido completo estará disponible durante la conversación.]';
            }
            
            systemPrompt += `\n\nContexto del documento:\n${documentContext}`;
            systemPrompt += "\n\nUsa este documento como referencia para responder las preguntas del usuario. Cita información específica del documento cuando sea relevante.";
            console.log('✅ Added document context to system prompt (original length:', config.documentContext.length, ', used length:', documentContext.length, ')');
          } else {
            console.log('❌ No document context found');
          }

          console.log('📝 Final system prompt length:', systemPrompt.length);
          console.log('📝 Final system prompt preview:', systemPrompt.substring(0, 300) + '...');

          const sessionUpdate = {
            type: 'session.update',
            session: {
              instructions: systemPrompt,
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 200
              },
              temperature: 0.7,
              max_response_output_tokens: 4096
            }
          };
          dc.send(JSON.stringify(sessionUpdate));
          console.log('Sent session update with complete system prompt');
        }
      };
      
      dc.onclose = () => console.log("Data channel closed");
      dc.onerror = (error) => console.error("Data channel error:", error);
      
      // Verificaciones críticas antes de crear el offer
      if (!dc) {
        throw new Error('Data channel not created - required for correct SDP order');
      }
      
      const senders = pc.getSenders();
      console.log('🔍 Current RTC senders before offer:', senders.length);
      console.log('🔍 Data channel state:', dc.readyState);
      
      // Pequeña pausa para asegurar que todo esté configurado
      await new Promise(resolve => setTimeout(resolve, 100));
        
      // Crear y enviar offer con configuraciones específicas para OpenAI Realtime API
      const offer = await pc.createOffer();
      console.log("Created offer, signaling state:", pc.signalingState);
      
      // Verificar el SDP antes de enviarlo
      if (offer.sdp) {
        console.log("Offer SDP preview:", offer.sdp.substring(0, 500));
        
        // Verificar que el SDP contiene las líneas m correctas
        const audioMLine = offer.sdp.includes('m=audio');
        const applicationMLine = offer.sdp.includes('m=application');
        console.log('🔍 SDP verification - Audio m-line:', audioMLine, 'Application m-line:', applicationMLine);
        
        if (!audioMLine) {
          console.warn('⚠️ Missing audio m-line in SDP offer');
        }
        if (!applicationMLine) {
          console.warn('⚠️ Missing application m-line in SDP offer');
        }
      }
      
      await pc.setLocalDescription(offer);
      console.log("Set local description, signaling state:", pc.signalingState);

      // Intercambiar SDP con OpenAI usando el modelo correcto
      const model = "gpt-4o-realtime-preview-2024-10-01";
      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp
      });
        
      if (!sdpResponse.ok) {
          const errorText = await sdpResponse.text();
          console.error("SDP Response error:", errorText);
          throw new Error(`SDP exchange failed: ${sdpResponse.statusText} - ${errorText}`);
      }
        
      const answerSdp = await sdpResponse.text();
      console.log("Received answer SDP length:", answerSdp.length);
      console.log("Answer SDP preview:", answerSdp.substring(0, 500));
      
      // Verificar que el SDP de respuesta es válido
      if (!answerSdp || answerSdp.trim() === '') {
        throw new Error('Received empty SDP answer');
      }
      
      // Pequeño delay para documentos grandes para evitar condiciones de carrera
      if (config.documentContext && config.documentContext.length > 10000) {
        console.log("Large document detected, adding processing delay...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Verificar que pc sigue siendo válido después del delay
      if (!pc) {
        throw new Error('PeerConnection was closed during setup');
      }
      
      // Verificar el estado de la conexión antes de continuar
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        throw new Error(`PeerConnection is in invalid state: ${pc.connectionState}`);
      }
      
      console.log("Received answer SDP, current signaling state:", pc.signalingState);
      
      const answer = { type: 'answer' as RTCSdpType, sdp: answerSdp };

      // Verificar el estado de la conexión antes de establecer la descripción remota
      if (pc.signalingState === 'have-local-offer') {
        console.log("Setting remote description...");
        try {
          await pc.setRemoteDescription(answer);
          console.log("Remote description set successfully, signaling state:", pc.signalingState);
        } catch (sdpError) {
          console.error("Failed to set remote description:", sdpError);
          console.error("Offer SDP:", offer.sdp?.substring(0, 1000));
          console.error("Answer SDP:", answerSdp.substring(0, 1000));
          throw sdpError;
        }
      } else if (pc.signalingState === 'stable') {
        console.warn("Connection already in stable state, skipping setRemoteDescription");
        if (!resolved) {
          connectionInProgress = false;
          resolved = true;
          cleanupTimeout();
          resolve();
        }
      } else {
        throw new Error(`Cannot set remote description in signaling state: ${pc.signalingState}`);
      }

    } catch (error) {
      console.error("Failed to connect via WebRTC:", error);
      connectionInProgress = false;
      if (!resolved) {
        resolved = true;
        cleanupTimeout();
      }
      // Limpiar recursos en caso de error
      if (pc) {
        pc.close();
        pc = null;
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
      }
      if (dc) {
        dc.close();
        dc = null;
      }
      reject(error);
    }
  });
};

export const sendAudio = (audioChunk: Buffer) => {
  // Con WebRTC, el audio se envía automáticamente a través del track de audio.
  // El data channel se puede usar para enviar eventos de texto o metadatos si es necesario.
  if (dc && dc.readyState === 'open') {
    // Ejemplo: enviar metadatos sobre el chunk de audio
    const metadata = {
      type: 'audio_chunk_metadata',
      size: audioChunk.length,
      timestamp: Date.now()
    };
    dc.send(JSON.stringify(metadata));
  }
};

export const disconnect = () => {
  console.log("Disconnecting WebRTC connection...");
  connectionInProgress = false;
  
  if (dc) {
    try {
      if (dc.readyState === 'open') {
        dc.close();
      }
    } catch (error) {
      console.warn("Error closing data channel:", error);
    }
    dc = null;
  }
  
  if (localStream) {
    try {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped local track:", track.kind);
      });
    } catch (error) {
      console.warn("Error stopping local stream tracks:", error);
    }
    localStream = null;
  }
  
  if (remoteAudioStream) {
    try {
      remoteAudioStream.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped remote track:", track.kind);
      });
    } catch (error) {
      console.warn("Error stopping remote stream tracks:", error);
    }
    remoteAudioStream = null;
  }
  
  if (pc) {
    try {
      console.log("Closing peer connection, current state:", pc.connectionState);
      pc.close();
    } catch (error) {
      console.warn("Error closing peer connection:", error);
    }
    pc = null;
  }
  
  console.log("WebRTC disconnection completed.");
};