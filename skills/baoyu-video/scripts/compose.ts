import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

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

interface ComposeOptions {
  inputDir: string;
  output: string;
  resolution: string;
  fps: number;
  transition: string;
  transitionDuration: number;
  subtitle: string | null;
  bgm: string | null;
  json: boolean;
}

function parseNarrationYaml(content: string): Narration {
  const slides: Slide[] = [];
  let current: Slide | null = null;
  let currentSentence: Partial<Sentence> | null = null;

  for (const rawLine of content.split("\n")) {
    const trimmed = rawLine.trim();

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
      if (currentSentence?.text) current.sentences.push(currentSentence as Sentence);
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

  if (current) {
    if (currentSentence?.text) current.sentences.push(currentSentence as Sentence);
    slides.push(current);
  }

  return { slides };
}

function getResolution(res: string): { w: number; h: number } {
  if (res === "4k") return { w: 3840, h: 2160 };
  if (res === "720p") return { w: 1280, h: 720 };
  return { w: 1920, h: 1080 };
}

function getFocusPoint(focus: string): { x: number; y: number } {
  const map: Record<string, { x: number; y: number }> = {
    "top-left": { x: 0.17, y: 0.17 },
    "top-center": { x: 0.5, y: 0.17 },
    "top-right": { x: 0.83, y: 0.17 },
    "center-left": { x: 0.17, y: 0.5 },
    "center": { x: 0.5, y: 0.5 },
    "center-right": { x: 0.83, y: 0.5 },
    "bottom-left": { x: 0.17, y: 0.83 },
    "bottom-center": { x: 0.5, y: 0.83 },
    "bottom-right": { x: 0.83, y: 0.83 },
    "title": { x: 0.5, y: 0.17 },
    "subtitle": { x: 0.5, y: 0.5 },
    "main": { x: 0.5, y: 0.5 },
    "full": { x: 0.5, y: 0.5 },
  };
  return map[focus] ?? { x: 0.5, y: 0.5 };
}

function buildZoompanFilter(
  slide: Slide,
  durations: Map<string, number>,
  resolution: { w: number; h: number },
  fps: number
): { filter: string; duration: number } {
  let totalDuration = 0;
  for (let i = 0; i < slide.sentences.length; i++) {
    const key = `${slide.slide}-${i}`;
    totalDuration += durations.get(key) ?? slide.sentences[i]!.duration_hint;
  }

  const totalFrames = Math.ceil(totalDuration * fps);
  const focusStart = slide.sentences.length > 0 ? getFocusPoint(slide.sentences[0]!.focus) : { x: 0.5, y: 0.5 };
  const focusEnd = slide.sentences.length > 1
    ? getFocusPoint(slide.sentences[slide.sentences.length - 1]!.focus)
    : focusStart;

  const kb = slide.ken_burns;
  let zoomStart = 1.0;
  let zoomEnd = 1.0;

  if (kb === "zoom-in") { zoomStart = 1.0; zoomEnd = 1.15; }
  else if (kb === "zoom-out") { zoomStart = 1.15; zoomEnd = 1.0; }
  else { zoomStart = 1.05; zoomEnd = 1.05; }

  const zExpr = `${zoomStart}+(${zoomEnd - zoomStart})*on/${totalFrames}`;
  const xExpr = `(iw-iw/zoom)/2+((iw/zoom)*${focusStart.x}-(iw/zoom)/2)*(1-on/${totalFrames})+((iw/zoom)*${focusEnd.x}-(iw/zoom)/2)*(on/${totalFrames})`;
  const yExpr = `(ih-ih/zoom)/2+((ih/zoom)*${focusStart.y}-(ih/zoom)/2)*(1-on/${totalFrames})+((ih/zoom)*${focusEnd.y}-(ih/zoom)/2)*(on/${totalFrames})`;

  const filter = `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=${resolution.w}x${resolution.h}:fps=${fps}`;

  return { filter, duration: totalDuration };
}

async function loadAudioMeta(audioDir: string): Promise<AudioMeta[]> {
  try {
    const metaPath = path.join(audioDir, "meta.json");
    return JSON.parse(await readFile(metaPath, "utf8")) as AudioMeta[];
  } catch {
    return [];
  }
}

function buildAudioConcat(audioMetas: AudioMeta[], audioDir: string): string[] {
  const files: string[] = [];
  for (const m of audioMetas) {
    files.push(path.join(audioDir, m.file));
  }
  return files;
}

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

function printUsage(): void {
  console.log(`Usage: bun compose.ts <input-dir> [options]

Options:
  --output <path>          Output video path (default: <input-dir>/<slug>.mp4)
  --resolution 720p|1080p|4k  Output resolution (default: 1080p)
  --fps <n>                Frame rate (default: 30)
  --transition fade|dissolve|none  Transition type (default: fade)
  --transition-duration <s>  Transition duration in seconds (default: 0.5)
  --subtitle <path>        Subtitle file (.srt)
  --bgm <path>             Background music file
  --json                   JSON output`);
}

function parseArgs(argv: string[]): ComposeOptions | null {
  if (argv.length < 1) return null;

  const opts: ComposeOptions = {
    inputDir: "",
    output: "",
    resolution: "1080p",
    fps: 30,
    transition: "fade",
    transitionDuration: 0.5,
    subtitle: null,
    bgm: null,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-h" || a === "--help") { printUsage(); process.exit(0); }
    if (a === "--json") { opts.json = true; continue; }
    if (a === "--output" && argv[i + 1]) { opts.output = argv[++i]!; continue; }
    if (a === "--resolution" && argv[i + 1]) { opts.resolution = argv[++i]!; continue; }
    if (a === "--fps" && argv[i + 1]) { opts.fps = parseInt(argv[++i]!, 10); continue; }
    if (a === "--transition" && argv[i + 1]) { opts.transition = argv[++i]!; continue; }
    if (a === "--transition-duration" && argv[i + 1]) { opts.transitionDuration = parseFloat(argv[++i]!); continue; }
    if (a === "--subtitle" && argv[i + 1]) { opts.subtitle = argv[++i]!; continue; }
    if (a === "--bgm" && argv[i + 1]) { opts.bgm = argv[++i]!; continue; }
    if (!a.startsWith("-") && !opts.inputDir) { opts.inputDir = a; continue; }
  }

  if (!opts.inputDir) return null;
  opts.inputDir = path.resolve(opts.inputDir);

  if (!opts.output) {
    const slug = path.basename(opts.inputDir);
    opts.output = path.join(opts.inputDir, `${slug}.mp4`);
  }

  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) { printUsage(); process.exit(1); }

  const narrationPath = path.join(opts.inputDir, "narration.yaml");
  if (!(await fileExists(narrationPath))) {
    throw new Error(`narration.yaml not found in ${opts.inputDir}`);
  }

  const narration = parseNarrationYaml(await readFile(narrationPath, "utf8"));
  const audioDir = path.join(opts.inputDir, "audio");
  const audioMetas = await loadAudioMeta(audioDir);
  const resolution = getResolution(opts.resolution);

  const durationsMap = new Map<string, number>();
  for (const m of audioMetas) {
    durationsMap.set(`${m.slide}-${m.sentence}`, m.duration);
  }

  const tempDir = path.join(opts.inputDir, ".tmp-compose");
  await mkdir(tempDir, { recursive: true });

  const slideClips: string[] = [];
  const slideDurations: number[] = [];

  for (const slide of narration.slides) {
    const imagePath = path.join(opts.inputDir, slide.image);
    if (!(await fileExists(imagePath))) {
      console.error(`Warning: Image not found: ${imagePath}, skipping slide ${slide.slide}`);
      continue;
    }

    const { filter, duration } = buildZoompanFilter(slide, durationsMap, resolution, opts.fps);
    const clipPath = path.join(tempDir, `slide-${String(slide.slide).padStart(2, "0")}.mp4`);

    const cmd = `ffmpeg -y -loop 1 -i "${imagePath}" -vf "scale=${resolution.w * 2}:${resolution.h * 2}:flags=lanczos,${filter},format=yuv420p" -t ${duration} -c:v libx264 -preset medium -crf 18 -r ${opts.fps} -an "${clipPath}"`;

    console.log(`Composing slide ${slide.slide}/${narration.slides.length}...`);
    execSync(cmd, { stdio: "pipe", timeout: 120000 });

    slideClips.push(clipPath);
    slideDurations.push(duration);
  }

  if (slideClips.length === 0) throw new Error("No slide clips generated");

  const concatListPath = path.join(tempDir, "concat.txt");
  const concatContent = slideClips.map((c) => `file '${c}'`).join("\n");
  await writeFile(concatListPath, concatContent, "utf8");

  let videoCmd: string;

  if (opts.transition === "none" || slideClips.length === 1) {
    videoCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -preset medium -crf 18`;
  } else {
    const inputs = slideClips.map((c) => `-i "${c}"`).join(" ");
    const filterParts: string[] = [];
    let lastLabel = "[0:v]";

    for (let i = 1; i < slideClips.length; i++) {
      const offset = slideDurations.slice(0, i).reduce((a, b) => a + b, 0) - opts.transitionDuration * i;
      const outLabel = i < slideClips.length - 1 ? `[v${i}]` : "[vout]";
      filterParts.push(`${lastLabel}[${i}:v]xfade=transition=${opts.transition}:duration=${opts.transitionDuration}:offset=${Math.max(0, offset).toFixed(2)}${outLabel}`);
      lastLabel = outLabel;
    }

    if (slideClips.length === 1) {
      videoCmd = `ffmpeg -y -i "${slideClips[0]}" -c:v libx264 -preset medium -crf 18`;
    } else {
      videoCmd = `ffmpeg -y ${inputs} -filter_complex "${filterParts.join(";")}" -map "[vout]" -c:v libx264 -preset medium -crf 18`;
    }
  }

  const videoOnlyPath = path.join(tempDir, "video-only.mp4");
  execSync(`${videoCmd} "${videoOnlyPath}"`, { stdio: "pipe", timeout: 600000 });

  const audioFiles = buildAudioConcat(audioMetas, audioDir);
  let finalCmd: string;

  if (audioFiles.length > 0) {
    const audioListPath = path.join(tempDir, "audio-concat.txt");
    const audioListContent = audioFiles.map((f) => `file '${f}'`).join("\n");
    await writeFile(audioListPath, audioListContent, "utf8");

    const mergedAudioPath = path.join(tempDir, "merged-audio.mp3");
    execSync(`ffmpeg -y -f concat -safe 0 -i "${audioListPath}" -c:a libmp3lame -q:a 2 "${mergedAudioPath}"`, { stdio: "pipe", timeout: 120000 });

    if (opts.bgm && await fileExists(opts.bgm)) {
      const mixedAudioPath = path.join(tempDir, "mixed-audio.mp3");
      execSync(`ffmpeg -y -i "${mergedAudioPath}" -i "${opts.bgm}" -filter_complex "[1:a]volume=0.15[bg];[0:a][bg]amix=inputs=2:duration=first" -c:a libmp3lame -q:a 2 "${mixedAudioPath}"`, { stdio: "pipe", timeout: 120000 });
      finalCmd = `ffmpeg -y -i "${videoOnlyPath}" -i "${mixedAudioPath}" -c:v copy -c:a aac -b:a 192k -shortest`;
    } else {
      finalCmd = `ffmpeg -y -i "${videoOnlyPath}" -i "${mergedAudioPath}" -c:v copy -c:a aac -b:a 192k -shortest`;
    }
  } else {
    finalCmd = `ffmpeg -y -i "${videoOnlyPath}" -c:v copy -an`;
  }

  const subtitlePath = opts.subtitle || path.join(opts.inputDir, "subtitle.srt");
  if (await fileExists(subtitlePath)) {
    let hasSubFilter = false;
    try {
      const out = execSync("ffmpeg -filters 2>&1", { encoding: "utf8", timeout: 5000 });
      hasSubFilter = /\bsubtitles\b/.test(out);
    } catch {}

    if (hasSubFilter) {
      const escapedSubPath = subtitlePath.replace(/'/g, "\\'").replace(/:/g, "\\:");
      finalCmd = finalCmd.replace("-c:v copy", "-c:v libx264 -preset medium -crf 18");
      finalCmd += ` -vf "subtitles='${escapedSubPath}':force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2'"`;
    } else {
      finalCmd = finalCmd.replace("ffmpeg -y", `ffmpeg -y -i "${subtitlePath}"`);
      finalCmd += ` -c:s mov_text -metadata:s:s:0 language=eng`;
    }
  }

  await mkdir(path.dirname(opts.output), { recursive: true });
  execSync(`${finalCmd} "${opts.output}"`, { stdio: "pipe", timeout: 600000 });

  execSync(`rm -rf "${tempDir}"`, { stdio: "pipe" });

  if (opts.json) {
    const totalDuration = slideDurations.reduce((a, b) => a + b, 0);
    console.log(JSON.stringify({
      output: opts.output,
      slides: narration.slides.length,
      duration: Math.round(totalDuration * 100) / 100,
      resolution: `${resolution.w}x${resolution.h}`,
      fps: opts.fps,
    }, null, 2));
  } else {
    console.log(opts.output);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
