import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

interface Sentence {
  text: string;
  focus: string;
  duration_hint: number;
}

interface Slide {
  slide: number;
  image: string;
  sentences: Sentence[];
  ken_burns: string;
}

interface Narration {
  slides: Slide[];
}

interface AudioMeta {
  file: string;
  duration: number;
  slide: number;
  sentence: number;
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function parseNarrationYaml(content: string): Narration {
  const slides: Slide[] = [];
  let current: Slide | null = null;
  let currentSentence: Partial<Sentence> | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("- slide:")) {
      if (current) {
        if (currentSentence?.text) current.sentences.push(currentSentence as Sentence);
        slides.push(current);
      }
      current = { slide: parseInt(trimmed.split(":")[1]!.trim()), image: "", sentences: [], ken_burns: "zoom-in" };
      currentSentence = null;
    } else if (current && trimmed.startsWith("image:")) {
      current.image = trimmed.split(":").slice(1).join(":").trim().replace(/['"]/g, "");
    } else if (current && trimmed.startsWith("ken_burns:")) {
      current.ken_burns = trimmed.split(":").slice(1).join(":").trim().replace(/['"]/g, "");
    } else if (current && trimmed.startsWith("- text:")) {
      if (currentSentence && currentSentence.text) {
        current.sentences.push(currentSentence as Sentence);
      }
      currentSentence = {
        text: trimmed.slice(7).trim().replace(/^["']|["']$/g, ""),
        focus: "center",
        duration_hint: 3.0,
      };
    } else if (currentSentence && trimmed.startsWith("focus:")) {
      currentSentence.focus = trimmed.split(":").slice(1).join(":").trim().replace(/['"]/g, "");
    } else if (currentSentence && trimmed.startsWith("duration_hint:")) {
      currentSentence.duration_hint = parseFloat(trimmed.split(":")[1]!.trim());
    }
  }

  if (currentSentence?.text && current) {
    current.sentences.push(currentSentence as Sentence);
  }
  if (current) slides.push(current);

  return { slides };
}

async function loadAudioDurations(audioDir: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const metaPath = path.join(audioDir, "meta.json");
    const meta = JSON.parse(await readFile(metaPath, "utf8")) as AudioMeta[];
    for (const m of meta) {
      map.set(`${m.slide}-${m.sentence}`, m.duration);
    }
  } catch {}
  return map;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: bun subtitle.ts <input-dir> [--output subtitle.srt]");
    process.exit(1);
  }

  const inputDir = path.resolve(args[0]!);
  let outputPath = path.join(inputDir, "subtitle.srt");

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) {
      outputPath = path.resolve(args[++i]!);
    }
  }

  const narrationPath = path.join(inputDir, "narration.yaml");
  const narrationContent = await readFile(narrationPath, "utf8");
  const narration = parseNarrationYaml(narrationContent);

  const audioDir = path.join(inputDir, "audio");
  const audioDurations = await loadAudioDurations(audioDir);

  const srtLines: string[] = [];
  let index = 1;
  let currentTime = 0;
  const transitionDuration = 0.5;

  for (const slide of narration.slides) {
    for (let si = 0; si < slide.sentences.length; si++) {
      const sentence = slide.sentences[si]!;
      const durationKey = `${slide.slide}-${si}`;
      const duration = audioDurations.get(durationKey) ?? sentence.duration_hint;

      const startTime = currentTime;
      const endTime = currentTime + duration;

      srtLines.push(String(index));
      srtLines.push(`${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}`);
      srtLines.push(sentence.text);
      srtLines.push("");

      currentTime = endTime;
      index++;
    }

    currentTime += transitionDuration;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, srtLines.join("\n"), "utf8");

  console.log(outputPath);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
