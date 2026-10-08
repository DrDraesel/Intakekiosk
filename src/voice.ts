export interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string; confidence?: number };
}
export interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResult };
}
export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export interface SpeechToTextProvider {
  supported(): boolean;
  create(): Recognition | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  }
}
export const browserSpeech: SpeechToTextProvider = {
  supported: () =>
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  create: () => {
    const Constructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    return Constructor ? new Constructor() : null;
  },
};
export function speak(
  text: string,
  enabled: boolean,
  done?: () => void,
  language = "en-US",
) {
  if (!enabled || !("speechSynthesis" in window)) {
    done?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  const voice =
    window.speechSynthesis.getVoices().find((v) => v.lang === language) ||
    window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith(language.split("-")[0]));
  if (voice) utterance.voice = voice;
  utterance.rate = 0.94;
  utterance.onend = () => done?.();
  utterance.onerror = () => done?.();
  window.speechSynthesis.speak(utterance);
}
