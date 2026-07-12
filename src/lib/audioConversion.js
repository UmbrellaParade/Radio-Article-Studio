const MP3_BITRATE_KBPS = 192;
const ENCODE_BLOCK_SIZE = 1152;

const waitForUi = () => new Promise((resolve) => setTimeout(resolve, 0));

const toInt16 = (samples) => {
  const output = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
};

const makeMp3FileName = (name = "audio.wav") =>
  String(name || "audio.wav").replace(/\.[^.]+$/, "") + ".mp3";

export const isWavFile = (file) => {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  return name.endsWith(".wav") || type.includes("wav");
};

export async function convertWavFileToMp3(file, onProgress = () => {}) {
  if (!file) throw new Error("変換するファイルがありません。");
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("このブラウザは音源変換に対応していません。");
  }

  onProgress({ phase: "decode", progress: 5, message: "WAVを読み込んでいます..." });
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContextClass();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const { default: lamejs } = await import("@breezystack/lamejs");
    const channels = Math.min(2, audioBuffer.numberOfChannels || 1);
    const left = toInt16(audioBuffer.getChannelData(0));
    const right = channels > 1 ? toInt16(audioBuffer.getChannelData(1)) : null;
    const encoder = new lamejs.Mp3Encoder(channels, audioBuffer.sampleRate, MP3_BITRATE_KBPS);
    const chunks = [];
    const totalBlocks = Math.ceil(left.length / ENCODE_BLOCK_SIZE);

    onProgress({ phase: "encode", progress: 15, message: "MP3へ変換しています..." });
    for (let offset = 0, blockIndex = 0; offset < left.length; offset += ENCODE_BLOCK_SIZE, blockIndex += 1) {
      const leftChunk = left.subarray(offset, offset + ENCODE_BLOCK_SIZE);
      const mp3Chunk = right
        ? encoder.encodeBuffer(leftChunk, right.subarray(offset, offset + ENCODE_BLOCK_SIZE))
        : encoder.encodeBuffer(leftChunk);
      if (mp3Chunk.length > 0) chunks.push(mp3Chunk);
      if (blockIndex % 40 === 0) {
        onProgress({
          phase: "encode",
          progress: Math.min(95, 15 + Math.round((blockIndex / totalBlocks) * 80)),
          message: "MP3へ変換しています..."
        });
        await waitForUi();
      }
    }

    const finalChunk = encoder.flush();
    if (finalChunk.length > 0) chunks.push(finalChunk);
    const blob = new Blob(chunks, { type: "audio/mpeg" });
    const mp3File = new File([blob], makeMp3FileName(file.name), {
      type: "audio/mpeg",
      lastModified: Date.now()
    });
    onProgress({ phase: "done", progress: 100, message: "MP3変換が完了しました。" });
    return {
      file: mp3File,
      originalName: file.name,
      originalSize: file.size,
      bitrateKbps: MP3_BITRATE_KBPS
    };
  } finally {
    if (audioContext.close) audioContext.close().catch(() => {});
  }
}
