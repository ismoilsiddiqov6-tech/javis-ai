// Speech Synthesis & Recognition Service for JARVIS

export interface SpeechListenerCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onListeningChange?: (listening: boolean) => void;
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private isListening = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  public isSpeechSupported = false;
  public isRecognitionSupported = false;

  constructor() {
    if (typeof window !== "undefined") {
      if ("speechSynthesis" in window) {
        this.synth = window.speechSynthesis;
        this.isSpeechSupported = true;
      }
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = "uz-UZ";
        this.isRecognitionSupported = true;
      }
    }
  }

  // Speak out loud with JARVIS persona
  public speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      pitch?: number;
      rate?: number;
    }
  ) {
    if (!this.synth) {
      options?.onEnd?.();
      return;
    }

    this.stopSpeaking();

    // Clean text of markdown characters, asterisks, brackets for clean speech
    const cleanText = text
      .replace(/[*#_`~]/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = options?.pitch ?? 0.95; // Slightly lower, authoritative & calm tone
    utterance.rate = options?.rate ?? 1.05; // Crisp delivery

    // Select suitable voice
    const voices = this.synth.getVoices();
    // Try to find Uzbek, or British English / calm male voice reminiscent of Paul Bettany
    const uzVoice = voices.find((v) => v.lang.startsWith("uz"));
    const enGbVoice = voices.find(
      (v) =>
        v.lang === "en-GB" &&
        (v.name.includes("Male") || v.name.includes("George") || v.name.includes("Oliver"))
    );
    const fallbackVoice =
      uzVoice ||
      enGbVoice ||
      voices.find((v) => v.lang.startsWith("en") && !v.name.includes("Zira")) ||
      voices[0];

    if (fallbackVoice) {
      utterance.voice = fallbackVoice;
    }

    utterance.onstart = () => {
      this.activeUtterance = utterance;
      options?.onStart?.();
    };

    utterance.onend = () => {
      this.activeUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn("Speech error:", e);
      this.activeUtterance = null;
      options?.onEnd?.();
    };

    this.synth.speak(utterance);
  }

  public stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.activeUtterance = null;
    }
  }

  // Voice recognition
  public startListening(callbacks: SpeechListenerCallbacks) {
    if (!this.recognition) {
      callbacks.onError?.("Brauzeringiz ovozli qidiruvni qo'llab-quvvatlamaydi.");
      return;
    }

    // Stop ongoing speech before listening to avoid echo
    this.stopSpeaking();

    try {
      this.recognition.onstart = () => {
        this.isListening = true;
        callbacks.onListeningChange?.(true);
      };

      this.recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const combined = final || interim;
        callbacks.onTranscript(combined, Boolean(final));
      };

      this.recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        this.isListening = false;
        callbacks.onListeningChange?.(false);
        callbacks.onError?.(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        callbacks.onListeningChange?.(false);
      };

      this.recognition.start();
    } catch (e: any) {
      console.warn("Recognition start failed:", e);
      this.isListening = false;
      callbacks.onListeningChange?.(false);
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechService();
