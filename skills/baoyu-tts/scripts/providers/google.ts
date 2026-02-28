import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { TtsResult } from "../types";

export function getDefaultVoice(): string {
  return process.env.GOOGLE_TTS_VOICE || "en-US-Standard-D";
}

export async function synthesize(
  text: string,
  voice: string,
  speed: number,
  lang: string | null,
  output: string
): Promise<TtsResult> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY or GOOGLE_API_KEY is required");

  const langCode = lang || inferLangFromVoice(voice) || "en-US";

  const body = {
    input: { text },
    voice: { languageCode: langCode, name: voice },
    audioConfig: { audioEncoding: "MP3", speakingRate: speed },
  };

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google TTS error (${res.status}): ${err}`);
  }

  const result = (await res.json()) as { audioContent: string };
  const buf = Uint8Array.from(Buffer.from(result.audioContent, "base64"));

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, buf);

  const duration = buf.length / (16000 / 8);
  const estimatedDuration = Math.round((text.length * 0.06 / speed) * 100) / 100;

  return {
    output: path.resolve(output),
    duration: estimatedDuration,
    provider: "google",
    voice,
    speed,
    textLength: text.length,
  };
}

function inferLangFromVoice(voice: string): string | null {
  const match = voice.match(/^([a-z]{2}-[A-Z]{2})/);
  return match ? match[1] : null;
}
