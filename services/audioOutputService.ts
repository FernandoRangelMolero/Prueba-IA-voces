const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
let audioQueue: ArrayBuffer[] = [];
let isPlaying = false;

const playNextChunk = () => {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const audioData = audioQueue.shift()!;
  audioContext.decodeAudioData(audioData, (buffer) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = playNextChunk;
    source.start();
  }, (err) => {
      console.error("Error decoding audio data", err);
      playNextChunk();
  });
};

export const playAudioChunk = (audioChunk: ArrayBuffer) => {
  audioQueue.push(audioChunk);
  if (!isPlaying) {
    playNextChunk();
  }
};

export const initializeAudio = () => {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}