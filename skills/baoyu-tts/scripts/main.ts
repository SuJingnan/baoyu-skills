import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import type { CliArgs, Provider, ExtendConfig, ProviderModule, TtsResult } from "./types";

function printUsage(): void {
  console.log(`Usage:
  npx -y bun scripts/main.ts --text "Hello world" --output hello.mp3
  npx -y bun scripts/main.ts --textfile narration.md --output narration.mp3
  npx -y bun scripts/main.ts --textfile narration.md --output narration.mp3 --provider google --lang zh-CN

Options:
  --text <text>                    Direct text input
  --textfile <path>                Read text from file
  --output <path>                  Output audio path (mp3/wav) (required)
  --provider openai|google|azure   TTS provider (auto-detect by default)
  --voice <name>                   Voice name
  --speed <float>                  Speaking speed 0.5-2.0 (default: 1.0)
  --lang <code>                    Language code (e.g., en-US, zh-CN)
  --json                           JSON output (includes duration metadata)
  -h, --help                       Show help

Environment variables:
  OPENAI_API_KEY                   OpenAI API key
  OPENAI_TTS_MODEL                 OpenAI TTS model (default: tts-1)
  OPENAI_TTS_VOICE                 OpenAI default voice (default: alloy)
  GOOGLE_TTS_API_KEY               Google TTS API key
  GOOGLE_API_KEY                   Google API key (fallback)
  GOOGLE_TTS_VOICE                 Google default voice
  AZURE_TTS_KEY                    Azure TTS subscription key
  AZURE_TTS_REGION                 Azure TTS region (e.g., eastus)
  AZURE_TTS_VOICE                  Azure default voice
  OPENAI_BASE_URL                  Custom OpenAI endpoint

Env file load order: CLI args > EXTEND.md > process.env > <cwd>/.baoyu-skills/.env > ~/.baoyu-skills/.env`);
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    text: null,
    textFile: null,
    output: null,
    provider: null,
    voice: null,
    speed: 1.0,
    lang: null,
    json: false,
    help: false,
  };

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;

    if (a === "--help" || a === "-h") { out.help = true; continue; }
    if (a === "--json") { out.json = true; continue; }

    if (a === "--text") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --text");
      out.text = v;
      continue;
    }

    if (a === "--textfile") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --textfile");
      out.textFile = v;
      continue;
    }

    if (a === "--output" || a === "-o") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --output");
      out.output = v;
      continue;
    }

    if (a === "--provider") {
      const v = argv[++i];
      if (v !== "openai" && v !== "google" && v !== "azure") throw new Error(`Invalid provider: ${v}`);
      out.provider = v;
      continue;
    }

    if (a === "--voice") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --voice");
      out.voice = v;
      continue;
    }

    if (a === "--speed") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --speed");
      const s = parseFloat(v);
      if (isNaN(s) || s < 0.5 || s > 2.0) throw new Error(`Invalid speed: ${v} (must be 0.5-2.0)`);
      out.speed = s;
      continue;
    }

    if (a === "--lang") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --lang");
      out.lang = v;
      continue;
    }

    if (a.startsWith("-")) throw new Error(`Unknown option: ${a}`);
    positional.push(a);
  }

  if (!out.text && !out.textFile && positional.length > 0) {
    out.text = positional.join(" ");
  }

  return out;
}

async function loadEnvFile(p: string): Promise<Record<string, string>> {
  try {
    const content = await readFile(p, "utf8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

async function loadEnv(): Promise<void> {
  const home = homedir();
  const cwd = process.cwd();

  const homeEnv = await loadEnvFile(path.join(home, ".baoyu-skills", ".env"));
  const cwdEnv = await loadEnvFile(path.join(cwd, ".baoyu-skills", ".env"));

  for (const [k, v] of Object.entries(homeEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(cwdEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

function extractYamlFrontMatter(content: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*$/m);
  return match ? match[1] : null;
}

function parseSimpleYaml(yaml: string): Partial<ExtendConfig> {
  const config: Partial<ExtendConfig> = {};
  const lines = yaml.split("\n");
  let currentKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.includes(":") && !trimmed.startsWith("-")) {
      const colonIdx = trimmed.indexOf(":");
      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();
      if (value === "null" || value === "") value = "null";

      if (key === "version") {
        config.version = value === "null" ? 1 : parseInt(value, 10);
      } else if (key === "default_provider") {
        config.default_provider = value === "null" ? null : (value as Provider);
      } else if (key === "default_speed") {
        config.default_speed = value === "null" ? null : parseFloat(value);
      } else if (key === "default_lang") {
        config.default_lang = value === "null" ? null : value;
      } else if (key === "default_voice") {
        config.default_voice = { openai: null, google: null, azure: null };
        currentKey = "default_voice";
      } else if (currentKey === "default_voice" && (key === "openai" || key === "google" || key === "azure")) {
        const cleaned = value.replace(/['"]/g, "");
        config.default_voice![key] = cleaned === "null" ? null : cleaned;
      }
    }
  }

  return config;
}

async function loadExtendConfig(): Promise<Partial<ExtendConfig>> {
  const home = homedir();
  const cwd = process.cwd();

  const paths = [
    path.join(cwd, ".baoyu-skills", "baoyu-tts", "EXTEND.md"),
    path.join(home, ".baoyu-skills", "baoyu-tts", "EXTEND.md"),
  ];

  for (const p of paths) {
    try {
      const content = await readFile(p, "utf8");
      const yaml = extractYamlFrontMatter(content);
      if (!yaml) continue;
      return parseSimpleYaml(yaml);
    } catch {
      continue;
    }
  }

  return {};
}

function detectProvider(args: CliArgs): Provider {
  if (args.provider) return args.provider;

  const hasOpenai = !!process.env.OPENAI_API_KEY;
  const hasGoogle = !!(process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY);
  const hasAzure = !!(process.env.AZURE_TTS_KEY && process.env.AZURE_TTS_REGION);

  const available = [hasOpenai && "openai", hasGoogle && "google", hasAzure && "azure"].filter(Boolean) as Provider[];

  if (available.length === 1) return available[0]!;
  if (available.length > 1) return available[0]!;

  throw new Error(
    "No TTS API key found. Set OPENAI_API_KEY, GOOGLE_TTS_API_KEY/GOOGLE_API_KEY, or AZURE_TTS_KEY+AZURE_TTS_REGION.\n" +
    "Create ~/.baoyu-skills/.env or <cwd>/.baoyu-skills/.env with your keys."
  );
}

async function loadProviderModule(provider: Provider): Promise<ProviderModule> {
  if (provider === "google") return (await import("./providers/google")) as ProviderModule;
  if (provider === "azure") return (await import("./providers/azure")) as ProviderModule;
  return (await import("./providers/openai")) as ProviderModule;
}

async function readTextFromStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;
  try {
    const t = await Bun.stdin.text();
    const v = t.trim();
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  await loadEnv();
  const extendConfig = await loadExtendConfig();

  args.provider = args.provider ?? extendConfig.default_provider ?? null;
  args.speed = args.speed !== 1.0 ? args.speed : (extendConfig.default_speed ?? 1.0);
  args.lang = args.lang ?? extendConfig.default_lang ?? null;

  let text: string | null = args.text;
  if (!text && args.textFile) text = (await readFile(args.textFile, "utf8")).trim();
  if (!text) text = await readTextFromStdin();

  if (!text) {
    console.error("Error: Text is required (--text, --textfile, or stdin)");
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!args.output) {
    console.error("Error: --output is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const provider = detectProvider(args);
  const providerModule = await loadProviderModule(provider);

  let voice = args.voice;
  if (!voice && extendConfig.default_voice) {
    voice = extendConfig.default_voice[provider] ?? null;
  }
  voice = voice || providerModule.getDefaultVoice();

  const output = path.resolve(args.output);

  let result: TtsResult;
  let retried = false;

  while (true) {
    try {
      result = await providerModule.synthesize(text, voice, args.speed, args.lang, output);
      break;
    } catch (e) {
      if (!retried) {
        retried = true;
        console.error("TTS failed, retrying...");
        continue;
      }
      throw e;
    }
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`${result.output} (${result.duration}s, ${result.provider}/${result.voice})`);
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  process.exit(1);
});
