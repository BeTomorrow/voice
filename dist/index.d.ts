import { EmitterSubscription } from 'react-native';
import { SpeechEndEvent, SpeechErrorEvent, SpeechEvents, SpeechRecognizedEvent, SpeechResultsEvent, SpeechStartEvent, SpeechVolumeChangeEvent } from './VoiceModuleTypes';
declare class RCTVoice {
    _loaded: boolean;
    _listeners: EmitterSubscription[] | null;
    _events: Required<SpeechEvents>;
    constructor();
    removeAllListeners(): void;
    destroy(): Promise<void>;
    start(locale: string, options?: {}): Promise<void>;
    stop(): Promise<void>;
    cancel(): Promise<void>;
    isAvailable(): Promise<boolean>;
    /**
     * (Android) Get a list of the speech recognition engines available on the device
     * */
    getSpeechRecognitionServices(): void | Promise<string[]>;
    isRecognizing(): Promise<boolean>;
    set onSpeechStart(fn: (e: SpeechStartEvent) => void);
    set onSpeechRecognized(fn: (e: SpeechRecognizedEvent) => void);
    set onSpeechEnd(fn: (e: SpeechEndEvent) => void);
    set onSpeechError(fn: (e: SpeechErrorEvent) => void);
    set onSpeechResults(fn: (e: SpeechResultsEvent) => void);
    set onSpeechPartialResults(fn: (e: SpeechResultsEvent) => void);
    set onSpeechVolumeChanged(fn: (e: SpeechVolumeChangeEvent) => void);
}
export { SpeechEndEvent, SpeechErrorEvent, SpeechEvents, SpeechStartEvent, SpeechRecognizedEvent, SpeechResultsEvent, SpeechVolumeChangeEvent, };
declare const _default: RCTVoice;
export default _default;
//# sourceMappingURL=index.d.ts.map