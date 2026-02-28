export type Provider = "openai" | "google" | "azure";

export type CliArgs = {
  text: string | null;
  textFile: string | null;
  output: string | null;
  provider: Provider | null;
  voice: string | null;
  speed: number;
  lang: string | null;
  json: boolean;
  help: boolean;
};

export type TtsResult = {
  output: string;
  duration: number;
  provider: Provider;
  voice: string;
  speed: number;
  textLength: number;
};

export type ExtendConfig = {
  version: number;
  default_provider: Provider | null;
  default_voice: {
    openai: string | null;
    google: string | null;
    azure: string | null;
  };
  default_speed: number | null;
  default_lang: string | null;
};

export type ProviderModule = {
  getDefaultVoice: () => string;
  synthesize: (text: string, voice: string, speed: number, lang: string | null, output: string) => Promise<TtsResult>;
};
