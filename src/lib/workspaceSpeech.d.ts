export function prepareWorkspaceSpeechText(input: string, locale?: string): string;

export function selectWorkspaceSpeechVoice<T extends {
  lang?: string;
  name?: string;
  default?: boolean;
}>(voices: T[], locale?: string): T | null;
