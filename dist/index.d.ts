/// <reference types="node" />
import { EmitterSubscription } from 'react-native';
import { SpeechEndEvent, SpeechErrorEvent, SpeechEvents, SpeechRecognizedEvent, SpeechResultsEvent, SpeechStartEvent, SpeechVolumeChangeEvent } from './VoiceModuleTypes';
interface SpeechRecognizerOptions {
    /**
     * Stop recording after `pauseFor` (ms) duration of no words detection
     * This is a maximum. System can stop recording before this timeout
     * Set to 0 to disable.
     * The default is `2500`
     */
    pauseFor: number;
    /**
     * Stop recording after `listenFor` (ms) duration
     * This is a maximum. System can stop recording beforehand.
     * The default is `0`
     */
    listenFor: number;
}
declare class RCTVoice {
    _loaded: boolean;
    _listeners: EmitterSubscription[] | null;
    _events: Required<SpeechEvents>;
    options: SpeechRecognizerOptions;
    _pauseForTimeoutID: NodeJS.Timeout | null;
    _listenForTimeoutID: NodeJS.Timeout | null;
    _preventNextResult: boolean;
    constructor();
    removeAllListeners(): void;
    destroy(): Promise<void>;
    start(locale: string, options?: Partial<SpeechRecognizerOptions>): Promise<void>;
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
    /**
     * After stop(); iOS send again the last detection
     * Prevent dispatching twice the result after ending with pauseFor timeout
     */
    private stopAndPreventNextResultiOS;
    private clearAllTimeout;
}
export { SpeechEndEvent, SpeechErrorEvent, SpeechEvents, SpeechStartEvent, SpeechRecognizedEvent, SpeechResultsEvent, SpeechVolumeChangeEvent, };
declare const _default: RCTVoice;
export default _default;
//# sourceMappingURL=index.d.ts.map