import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { TtsResult } from "../types";

export function getDefaultVoice(): string {
  return process.env.OPENAI_TTS_VOICE || "alloy";
}

export async function synthesize(
  text: string,
  voice: string,
  speed: number,
  _lang: string | null,
  output: string
): Promise<TtsResult> {
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required");

  const model = process.env.OPENAI_TTS_MODEL || "tts-1";

  const res = await fetch(`${baseURL}/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text, voice, speed, response_format: "mp3" }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS error (${res.status}): ${err}`);
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, buf);

  const duration = estimateMp3Duration(buf);

  return { output: path.resolve(output), duration, provider: "openai", voice, speed, textLength: text.length };
}

function estimateMp3Duration(buf: Uint8Array): number {
  let offset = 0;
  let totalFrames = 0;
  let totalDuration = 0;

  while (offset < buf.length - 4) {
    if (buf[offset] === 0xff && (buf[offset + 1]! & 0xe0) === 0xe0) {
      const header = (buf[offset]! << 24) | (buf[offset + 1]! << 16) | (buf[offset + 2]! << 8) | buf[offset + 3]!;
      const versionBits = (header >> 19) & 0x03;
      const layerBits = (header >> 17) & 0x03;
      const bitrateBits = (header >> 12) & 0x0f;
      const sampleRateBits = (header >> 10) & 0x03;
      const paddingBit = (header >> 9) & 0x01;

      if (bitrateBits === 0 || bitrateBits === 15 || sampleRateBits === 3) {
        offset++;
        continue;
      }

      const bitrateTable: Record<string, number[]> = {
        "3-1": [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
        "3-2": [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
        "3-3": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
        "2-1": [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
        "2-2": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
        "2-3": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
      };

      const sampleRateTable: Record<number, number[]> = {
        3: [44100, 48000, 32000],
        2: [22050, 24000, 16000],
        0: [11025, 12000, 8000],
      };

      const key = `${versionBits}-${layerBits}`;
      const rates = bitrateTable[key];
      const sampleRates = sampleRateTable[versionBits];

      if (!rates || !sampleRates) {
        offset++;
        continue;
      }

      const bitrate = rates[bitrateBits]! * 1000;
      const sampleRate = sampleRates[sampleRateBits]!;

      if (!bitrate || !sampleRate) {
        offset++;
        continue;
      }

      const samplesPerFrame = layerBits === 1 ? (versionBits === 3 ? 1152 : 576) : 384;
      const frameSize = layerBits === 1
        ? Math.floor((samplesPerFrame * bitrate) / (8 * sampleRate)) + paddingBit
        : Math.floor((samplesPerFrame * bitrate) / (8 * sampleRate)) + paddingBit;

      if (frameSize < 1) {
        offset++;
        continue;
      }

      totalFrames++;
      totalDuration += samplesPerFrame / sampleRate;
      offset += frameSize;
    } else if (buf[offset] === 0x49 && buf[offset + 1] === 0x44 && buf[offset + 2] === 0x33) {
      if (offset + 10 > buf.length) break;
      const size = ((buf[offset + 6]! & 0x7f) << 21) | ((buf[offset + 7]! & 0x7f) << 14) | ((buf[offset + 8]! & 0x7f) << 7) | (buf[offset + 9]! & 0x7f);
      offset += 10 + size;
    } else {
      offset++;
    }
  }

  return totalFrames > 0 ? Math.round(totalDuration * 100) / 100 : text.length * 0.06;
}
