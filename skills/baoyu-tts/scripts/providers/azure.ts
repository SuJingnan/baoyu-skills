import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { TtsResult } from "../types";

export function getDefaultVoice(): string {
  return process.env.AZURE_TTS_VOICE || "en-US-JennyNeural";
}

export async function synthesize(
  text: string,
  voice: string,
  speed: number,
  lang: string | null,
  output: string
): Promise<TtsResult> {
  const key = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION;
  if (!key) throw new Error("AZURE_TTS_KEY is required");
  if (!region) throw new Error("AZURE_TTS_REGION is required");

  const token = await getAccessToken(key, region);
  const langCode = lang || inferLangFromVoice(voice) || "en-US";
  const ratePercent = Math.round((speed - 1) * 100);
  const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${langCode}">
  <voice name="${voice}">
    <prosody rate="${rateStr}">${escapeXml(text)}</prosody>
  </voice>
</speak>`;

  const res = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
      },
      body: ssml,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Azure TTS error (${res.status}): ${err}`);
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, buf);

  const estimatedDuration = Math.round((text.length * 0.06 / speed) * 100) / 100;

  return {
    output: path.resolve(output),
    duration: estimatedDuration,
    provider: "azure",
    voice,
    speed,
    textLength: text.length,
  };
}

async function getAccessToken(key: string, region: string): Promise<string> {
  const res = await fetch(
    `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Length": "0",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Azure token error (${res.status}): ${await res.text()}`);
  }

  return res.text();
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function inferLangFromVoice(voice: string): string | null {
  const match = voice.match(/^([a-z]{2}-[A-Z]{2})/);
  return match ? match[1] : null;
}
