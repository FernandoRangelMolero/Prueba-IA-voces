import { AssemblyAI } from 'assemblyai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ElevenLabs from 'elevenlabs-node';

class AgoraService {
    constructor(ws) {
        this.ws = ws;
        this.assemblyai = new AssemblyAI({
            apiKey: process.env.ASSEMBLYAI_API_KEY,
        });
        this.googleai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        this.elevenlabs = new ElevenLabs({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });
        this.assemblyaiRealtime = null;
    }

    start() {
        this.ws.on('message', (message) => {
            const data = JSON.parse(message);
            if (data.type === 'audio') {
                if (!this.assemblyaiRealtime) {
                    this.setupAssemblyAI();
                }
                this.assemblyaiRealtime.send(data.audio_chunk);
            }
        });

        this.ws.on('close', () => {
            if (this.assemblyaiRealtime) {
                this.assemblyaiRealtime.close();
            }
        });
    }

    setupAssemblyAI() {
        this.assemblyaiRealtime = this.assemblyai.realtime.create({
            sampleRate: 16000,
        });

        this.assemblyaiRealtime.on('open', () => {
            console.log('AssemblyAI Real-time session opened');
        });

        this.assemblyaiRealtime.on('transcript', (transcript) => {
            if (transcript.message_type === 'FinalTranscript') {
                this.handleTranscription(transcript.text);
            }
        });

        this.assemblyaiRealtime.on('error', (error) => {
            console.error('AssemblyAI Error:', error);
        });

        this.assemblyaiRealtime.on('close', () => {
            console.log('AssemblyAI Real-time session closed');
            this.assemblyaiRealtime = null;
        });
    }

    async handleTranscription(text) {
        console.log('Transcription:', text);

        try {
            const model = this.googleai.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(text);
            const response = await result.response;
            const geminiText = response.text();

            console.log('Gemini Response:', geminiText);

            const audio = await this.elevenlabs.textToSpeech({
                text: geminiText,
                voiceId: '21m00Tcm4TlvDq8ikWAM', // Example voice ID
                model_id: 'eleven_multilingual_v2'
            });

            this.ws.send(JSON.stringify({ type: 'audio', audio_chunk: audio }));
            this.ws.send(JSON.stringify({ type: 'audio_end' }));

        } catch (error) {
            console.error('Error handling transcription:', error);
        }
    }
}

export default AgoraService;
