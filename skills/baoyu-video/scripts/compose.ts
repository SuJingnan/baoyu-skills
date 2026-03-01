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
  transition?: string;
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
  aspect: string;
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
    } else if (current && trimmed.startsWith("transition:")) {
      current.transition = trimmed.split(":").slice(1).join(":").trim().replace(/['"]/g, "");
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

function getResolution(res: string, portrait = false): { w: number; h: number } {
  let r: { w: number; h: number };
  if (res === "4k") r = { w: 3840, h: 2160 };
  else if (res === "720p") r = { w: 1280, h: 720 };
  else r = { w: 1920, h: 1080 };
  return portrait ? { w: r.h, h: r.w } : r;
}

function getImageDimensions(imagePath: string): { w: number; h: number } | null {
  try {
    const out = execSync(`ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 "${imagePath}"`, { encoding: "utf8", timeout: 10000 }).trim();
    const [w, h] = out.split(",").map(Number);
    if (w && h) return { w, h };
  } catch {}
  return null;
}

function buildScaleFilter(imgW: number, imgH: number, targetW: number, targetH: number): string {
  const imgRatio = imgW / imgH;
  const targetRatio = targetW / targetH;
  const tw = targetW * 2;
  const th = targetH * 2;

  if (Math.abs(imgRatio - targetRatio) < 0.01) {
    return `scale=${tw}:${th}:flags=lanczos`;
  }

  if (imgRatio > targetRatio) {
    return `scale=${tw}:-2:flags=lanczos,pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2:black`;
  }
  return `scale=-2:${th}:flags=lanczos,pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2:black`;
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
  const t = `(1-cos(PI*on/${totalFrames}))/2`;

  let zoomStart = 1.0;
  let zoomEnd = 1.0;
  let panXDir = 0;
  let panYDir = 0;
  let isDrift = false;
  let isNone = false;

  if (kb === "zoom-in") { zoomStart = 1.0; zoomEnd = 1.15; }
  else if (kb === "zoom-out") { zoomStart = 1.15; zoomEnd = 1.0; }
  else if (kb === "zoom-in-pan-right") { zoomStart = 1.0; zoomEnd = 1.12; panXDir = 1; }
  else if (kb === "zoom-in-pan-down") { zoomStart = 1.0; zoomEnd = 1.12; panYDir = 1; }
  else if (kb === "zoom-out-pan-left") { zoomStart = 1.12; zoomEnd = 1.0; panXDir = -1; }
  else if (kb === "zoom-out-pan-up") { zoomStart = 1.12; zoomEnd = 1.0; panYDir = -1; }
  else if (kb === "drift") { zoomStart = 1.0; zoomEnd = 1.05; isDrift = true; }
  else if (kb === "none") { isNone = true; }
  else if (kb.startsWith("pan-")) {
    zoomStart = 1.05; zoomEnd = 1.05;
    if (kb === "pan-right") panXDir = 1;
    else if (kb === "pan-left") panXDir = -1;
    else if (kb === "pan-down") panYDir = 1;
    else if (kb === "pan-up") panYDir = -1;
  } else {
    zoomStart = 1.05; zoomEnd = 1.05;
  }

  let zExpr: string;
  let xExpr: string;
  let yExpr: string;

  if (isNone) {
    zExpr = "1";
    xExpr = "(iw-iw/zoom)/2";
    yExpr = "(ih-ih/zoom)/2";
  } else if (isDrift) {
    const driftAmp = 0.02;
    zExpr = `${zoomStart}+(${zoomEnd - zoomStart})*${t}`;
    xExpr = `(iw-iw/zoom)/2+(iw/zoom)*${driftAmp}*sin(2*PI*on/${totalFrames})`;
    yExpr = `(ih-ih/zoom)/2+(ih/zoom)*${driftAmp}*cos(2*PI*on/${totalFrames})`;
  } else if (panXDir !== 0 || panYDir !== 0) {
    const panRange = 0.12;
    zExpr = `${zoomStart}+(${zoomEnd - zoomStart})*${t}`;
    if (panXDir !== 0) {
      const xStart = panXDir > 0 ? focusStart.x - panRange / 2 : focusStart.x + panRange / 2;
      const xEnd = panXDir > 0 ? focusEnd.x + panRange / 2 : focusEnd.x - panRange / 2;
      xExpr = `(iw-iw/zoom)/2+((iw/zoom)*${xStart.toFixed(3)}-(iw/zoom)/2)*(1-${t})+((iw/zoom)*${xEnd.toFixed(3)}-(iw/zoom)/2)*${t}`;
    } else {
      xExpr = `(iw-iw/zoom)/2+((iw/zoom)*${focusStart.x}-(iw/zoom)/2)*(1-${t})+((iw/zoom)*${focusEnd.x}-(iw/zoom)/2)*${t}`;
    }
    if (panYDir !== 0) {
      const yStart = panYDir > 0 ? focusStart.y - panRange / 2 : focusStart.y + panRange / 2;
      const yEnd = panYDir > 0 ? focusEnd.y + panRange / 2 : focusEnd.y - panRange / 2;
      yExpr = `(ih-ih/zoom)/2+((ih/zoom)*${yStart.toFixed(3)}-(ih/zoom)/2)*(1-${t})+((ih/zoom)*${yEnd.toFixed(3)}-(ih/zoom)/2)*${t}`;
    } else {
      yExpr = `(ih-ih/zoom)/2+((ih/zoom)*${focusStart.y}-(ih/zoom)/2)*(1-${t})+((ih/zoom)*${focusEnd.y}-(ih/zoom)/2)*${t}`;
    }
  } else {
    zExpr = `${zoomStart}+(${zoomEnd - zoomStart})*${t}`;
    xExpr = `(iw-iw/zoom)/2+((iw/zoom)*${focusStart.x}-(iw/zoom)/2)*(1-${t})+((iw/zoom)*${focusEnd.x}-(iw/zoom)/2)*${t}`;
    yExpr = `(ih-ih/zoom)/2+((ih/zoom)*${focusStart.y}-(ih/zoom)/2)*(1-${t})+((ih/zoom)*${focusEnd.y}-(ih/zoom)/2)*${t}`;
  }

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

const TRANSITIONS = [
  "fade", "dissolve", "wipeleft", "wiperight", "wipeup", "wipedown",
  "slideleft", "slideright", "slideup", "slidedown",
  "circleopen", "circleclose", "radial",
  "fadeblack", "fadewhite", "pixelize", "zoomin",
] as const;

const AUTO_TRANSITION_MAP: Record<string, string[]> = {
  "zoom-in": ["circleopen", "zoomin"],
  "zoom-out": ["circleclose", "fade"],
  "pan-right": ["wiperight", "slideright"],
  "pan-left": ["wipeleft", "slideleft"],
  "pan-down": ["wipedown", "slidedown"],
  "pan-up": ["wipeup", "slideup"],
  "zoom-in-pan-right": ["wiperight", "zoomin"],
  "zoom-in-pan-down": ["wipedown", "zoomin"],
  "zoom-out-pan-left": ["wipeleft", "circleclose"],
  "zoom-out-pan-up": ["wipeup", "circleclose"],
  "drift": ["dissolve", "fade"],
  "none": ["fade", "dissolve"],
};

function pickAutoTransition(kb: string, index: number): string {
  const candidates = AUTO_TRANSITION_MAP[kb] ?? ["fade"];
  return candidates[index % candidates.length]!;
}

function pickRandomTransition(): string {
  return TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)]!;
}

function resolveTransition(globalTransition: string, slide: Slide, nextSlide: Slide | undefined, index: number): string {
  if (slide.transition && slide.transition !== "auto" && slide.transition !== "random") return slide.transition;
  if (globalTransition === "none") return "none";
  if (globalTransition === "auto") return pickAutoTransition(slide.ken_burns, index);
  if (globalTransition === "random") return pickRandomTransition();
  return globalTransition;
}

function printUsage(): void {
  console.log(`Usage: bun compose.ts <input-dir> [options]

Options:
  --output <path>          Output video path (default: <input-dir>/<slug>.mp4)
  --resolution 720p|1080p|4k  Output resolution (default: 1080p)
  --aspect auto|16:9|9:16|3:4|4:3  Output aspect ratio (default: auto)
  --fps <n>                Frame rate (default: 30)
  --transition <type>      Transition: fade|dissolve|none|auto|random|wipeleft|wiperight|
                           wipeup|wipedown|slideleft|slideright|slideup|slidedown|
                           circleopen|circleclose|radial|fadeblack|fadewhite|pixelize|zoomin
                           (default: fade)
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
    aspect: "auto",
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
    if (a === "--aspect" && argv[i + 1]) { opts.aspect = argv[++i]!; continue; }
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

  let portrait = false;
  if (opts.aspect === "auto") {
    const firstImage = narration.slides[0]?.image;
    if (firstImage) {
      const dims = getImageDimensions(path.join(opts.inputDir, firstImage));
      if (dims) portrait = dims.h > dims.w;
    }
  } else if (opts.aspect === "9:16" || opts.aspect === "3:4") {
    portrait = true;
  }

  const resolution = getResolution(opts.resolution, portrait);

  const durationsMap = new Map<string, number>();
  for (const m of audioMetas) {
    durationsMap.set(`${m.slide}-${m.sentence}`, m.duration);
  }

  const tempDir = path.join(opts.inputDir, ".tmp-compose");
  await mkdir(tempDir, { recursive: true });

  const slideClips: string[] = [];
  const slideDurations: number[] = [];
  const composedSlides: Slide[] = [];

  for (const slide of narration.slides) {
    const imagePath = path.join(opts.inputDir, slide.image);
    if (!(await fileExists(imagePath))) {
      console.error(`Warning: Image not found: ${imagePath}, skipping slide ${slide.slide}`);
      continue;
    }

    const imgDims = getImageDimensions(imagePath);
    const scaleFilter = imgDims
      ? buildScaleFilter(imgDims.w, imgDims.h, resolution.w, resolution.h)
      : `scale=${resolution.w * 2}:${resolution.h * 2}:flags=lanczos`;

    const { filter, duration } = buildZoompanFilter(slide, durationsMap, resolution, opts.fps);
    const clipPath = path.join(tempDir, `slide-${String(slide.slide).padStart(2, "0")}.mp4`);

    const cmd = `ffmpeg -y -loop 1 -i "${imagePath}" -vf "${scaleFilter},${filter},format=yuv420p" -t ${duration} -c:v libx264 -preset medium -crf 18 -r ${opts.fps} -an "${clipPath}"`;

    console.log(`Composing slide ${slide.slide}/${narration.slides.length}...`);
    execSync(cmd, { stdio: "pipe", timeout: 120000 });

    slideClips.push(clipPath);
    slideDurations.push(duration);
    composedSlides.push(slide);
  }

  if (slideClips.length === 0) throw new Error("No slide clips generated");

  const numTransitions = slideClips.length > 1 ? slideClips.length - 1 : 0;
  const allNoneCheck = opts.transition === "none" && composedSlides.every((s) => !s.transition || s.transition === "none");
  const transitionOverlap = (allNoneCheck || slideClips.length === 1) ? 0 : opts.transitionDuration * numTransitions;

  if (transitionOverlap > 0 && slideClips.length > 1) {
    const lastIdx = slideClips.length - 1;
    const lastSlide = composedSlides[lastIdx]!;
    const lastImagePath = path.join(opts.inputDir, lastSlide.image);
    const imgDims = getImageDimensions(lastImagePath);
    const scaleFilter = imgDims
      ? buildScaleFilter(imgDims.w, imgDims.h, resolution.w, resolution.h)
      : `scale=${resolution.w * 2}:${resolution.h * 2}:flags=lanczos`;
    const paddedDuration = slideDurations[lastIdx]! + transitionOverlap;
    const paddedFrames = Math.ceil(paddedDuration * opts.fps);

    const kb = lastSlide.ken_burns;
    const t = `(1-cos(PI*on/${paddedFrames}))/2`;
    let zoomStart = 1.0, zoomEnd = 1.0, panXDir = 0, panYDir = 0, isDrift = false, isNone = false;
    if (kb === "zoom-in") { zoomStart = 1.0; zoomEnd = 1.15; }
    else if (kb === "zoom-out") { zoomStart = 1.15; zoomEnd = 1.0; }
    else if (kb === "zoom-in-pan-right") { zoomStart = 1.0; zoomEnd = 1.12; panXDir = 1; }
    else if (kb === "zoom-in-pan-down") { zoomStart = 1.0; zoomEnd = 1.12; panYDir = 1; }
    else if (kb === "zoom-out-pan-left") { zoomStart = 1.12; zoomEnd = 1.0; panXDir = -1; }
    else if (kb === "zoom-out-pan-up") { zoomStart = 1.12; zoomEnd = 1.0; panYDir = -1; }
    else if (kb === "drift") { zoomStart = 1.0; zoomEnd = 1.05; isDrift = true; }
    else if (kb === "none") { isNone = true; }
    else if (kb.startsWith("pan-")) {
      zoomStart = 1.05; zoomEnd = 1.05;
      if (kb === "pan-right") panXDir = 1;
      else if (kb === "pan-left") panXDir = -1;
      else if (kb === "pan-down") panYDir = 1;
      else if (kb === "pan-up") panYDir = -1;
    } else { zoomStart = 1.05; zoomEnd = 1.05; }

    const focusStart = lastSlide.sentences.length > 0 ? getFocusPoint(lastSlide.sentences[0]!.focus) : { x: 0.5, y: 0.5 };
    const focusEnd = lastSlide.sentences.length > 1 ? getFocusPoint(lastSlide.sentences[lastSlide.sentences.length - 1]!.focus) : focusStart;
    let zExpr: string, xExpr: string, yExpr: string;
    if (isNone) { zExpr = "1"; xExpr = "(iw-iw/zoom)/2"; yExpr = "(ih-ih/zoom)/2"; }
    else if (isDrift) {
      zExpr = `${zoomStart}+(${zoomEnd - zoomStart})*${t}`;
      xExpr = `(iw-iw/zoom)/2+(iw/zoom)*0.02*sin(2*PI*on/${paddedFrames})`;
      yExpr = `(ih-ih/zoom)/2+(ih/zoom)*0.02*cos(2*PI*on/${paddedFrames})`;
    } else if (panXDir !== 0 || panYDir !== 0) {
      const panRange = 0.12;
      zExpr = `${zoomStart}+(${zoomEnd - zoomStart})*${t}`;
      if (panXDir !== 0) {
        const xS = panXDir > 0 ? focusStart.x - panRange / 2 : focusStart.x + panRange / 2;
        const xE = panXDir > 0 ? focusEnd.x + panRange / 2 : focusEnd.x - panRange / 2;
        xExpr = `(iw-iw/zoom)/2+((iw/zoom)*${xS.toFixed(3)}-(iw/zoom)/2)*(1-${t})+((iw/zoom)*${xE.toFixed(3)}-(iw/zoom)/2)*${t}`;
      } else {
        xExpr = `(iw-iw/zoom)/2+((iw/zoom)*${focusStart.x}-(iw/zoom)/2)*(1-${t})+((iw/zoom)*${focusEnd.x}-(iw/zoom)/2)*${t}`;
      }
      if (panYDir !== 0) {
        const yS = panYDir > 0 ? focusStart.y - panRange / 2 : focusStart.y + panRange / 2;
        const yE = panYDir > 0 ? focusEnd.y + panRange / 2 : focusEnd.y - panRange / 2;
        yExpr = `(ih-ih/zoom)/2+((ih/zoom)*${yS.toFixed(3)}-(ih/zoom)/2)*(1-${t})+((ih/zoom)*${yE.toFixed(3)}-(ih/zoom)/2)*${t}`;
      } else {
        yExpr = `(ih-ih/zoom)/2+((ih/zoom)*${focusStart.y}-(ih/zoom)/2)*(1-${t})+((ih/zoom)*${focusEnd.y}-(ih/zoom)/2)*${t}`;
      }
    } else {
      zExpr = `${zoomStart}+(${zoomEnd - zoomStart})*${t}`;
      xExpr = `(iw-iw/zoom)/2+((iw/zoom)*${focusStart.x}-(iw/zoom)/2)*(1-${t})+((iw/zoom)*${focusEnd.x}-(iw/zoom)/2)*${t}`;
      yExpr = `(ih-ih/zoom)/2+((ih/zoom)*${focusStart.y}-(ih/zoom)/2)*(1-${t})+((ih/zoom)*${focusEnd.y}-(ih/zoom)/2)*${t}`;
    }

    const paddedFilter = `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${paddedFrames}:s=${resolution.w}x${resolution.h}:fps=${opts.fps}`;
    const paddedClipPath = path.join(tempDir, `slide-${String(lastSlide.slide).padStart(2, "0")}-padded.mp4`);
    const padCmd = `ffmpeg -y -loop 1 -i "${lastImagePath}" -vf "${scaleFilter},${paddedFilter},format=yuv420p" -t ${paddedDuration} -c:v libx264 -preset medium -crf 18 -r ${opts.fps} -an "${paddedClipPath}"`;
    console.log(`Padding last slide ${lastSlide.slide} by ${transitionOverlap.toFixed(2)}s to compensate for transitions...`);
    execSync(padCmd, { stdio: "pipe", timeout: 120000 });

    slideClips[lastIdx] = paddedClipPath;
    slideDurations[lastIdx] = paddedDuration;
  }

  const concatListPath = path.join(tempDir, "concat.txt");
  const concatContent = slideClips.map((c) => `file '${c}'`).join("\n");
  await writeFile(concatListPath, concatContent, "utf8");

  let videoCmd: string;

  if (allNoneCheck || slideClips.length === 1) {
    videoCmd = slideClips.length === 1
      ? `ffmpeg -y -i "${slideClips[0]}" -c:v libx264 -preset medium -crf 18`
      : `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -preset medium -crf 18`;
  } else {
    const inputs = slideClips.map((c) => `-i "${c}"`).join(" ");
    const filterParts: string[] = [];
    let lastLabel = "[0:v]";

    for (let i = 1; i < slideClips.length; i++) {
      const tr = resolveTransition(opts.transition, composedSlides[i - 1]!, composedSlides[i], i - 1);
      const offset = slideDurations.slice(0, i).reduce((a, b) => a + b, 0) - opts.transitionDuration * i;
      const outLabel = i < slideClips.length - 1 ? `[v${i}]` : "[vout]";
      if (tr === "none") {
        filterParts.push(`${lastLabel}[${i}:v]xfade=transition=fade:duration=0.01:offset=${Math.max(0, offset + opts.transitionDuration - 0.01).toFixed(2)}${outLabel}`);
      } else {
        filterParts.push(`${lastLabel}[${i}:v]xfade=transition=${tr}:duration=${opts.transitionDuration}:offset=${Math.max(0, offset).toFixed(2)}${outLabel}`);
      }
      lastLabel = outLabel;
    }

    videoCmd = `ffmpeg -y ${inputs} -filter_complex "${filterParts.join(";")}" -map "[vout]" -c:v libx264 -preset medium -crf 18`;
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
