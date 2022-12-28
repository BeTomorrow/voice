import invariant from 'invariant';
import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModule,
  NativeModules,
  Platform,
} from 'react-native';
import {
  SpeechEndEvent,
  SpeechErrorEvent,
  SpeechEvents,
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechStartEvent,
  SpeechVolumeChangeEvent,
  VoiceEventType,
  VoiceModule,
} from './VoiceModuleTypes';

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
class RCTVoice {
  _loaded: boolean;
  options: SpeechRecognizerOptions;
  _pauseForTimeoutID: NodeJS.Timeout | null;
  _listenForTimeoutID: NodeJS.Timeout | null;
  _preventNextResult = false;
  private Voice = NativeModules.VoiceModule as VoiceModule & NativeModule;
  private _voiceEmitter: NativeEventEmitter | null =
    Platform.OS !== 'web' ? new NativeEventEmitter(this.Voice) : null;

  constructor() {
    this._loaded = false;
    this._pauseForTimeoutID = null;
    this._listenForTimeoutID = null;
    this.options = {
      pauseFor: 2500,
      listenFor: 0,
    };
  }

  destroy() {
    if (!this._loaded) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this.clearAllTimeout();
      this.Voice.destroySpeech((error: string) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve();
        }
      });
    });
  }

  start(locale: string, options?: Partial<SpeechRecognizerOptions>) {
    this.options = { ...this.options, ...options };

    return new Promise<void>((resolve, reject) => {
      const callback = (error: string) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve();
        }
      };
      if (Platform.OS === 'android') {
        this.Voice.startSpeech(
          locale,
          {
            EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
            EXTRA_MAX_RESULTS: 5,
            EXTRA_PARTIAL_RESULTS: true,
            REQUEST_PERMISSIONS_AUTO: true,
          },
          callback,
        );
      } else {
        this.Voice.startSpeech(locale, {}, callback);
      }
    });
  }
  stop() {
    return new Promise<void>((resolve, reject) => {
      this.clearAllTimeout();
      this.Voice.stopSpeech((error) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve();
        }
      });
    });
  }
  cancel() {
    return new Promise<void>((resolve, reject) => {
      this.clearAllTimeout();
      this.Voice.cancelSpeech((error) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve();
        }
      });
    });
  }
  isAvailable(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.Voice.isSpeechAvailable((isAvailable: boolean, error: string) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve(isAvailable);
        }
      });
    });
  }

  /**
   * (Android) Get a list of the speech recognition engines available on the device
   * */
  getSpeechRecognitionServices() {
    if (Platform.OS !== 'android') {
      invariant(
        this.Voice,
        'Speech recognition services can be queried for only on Android',
      );
      return;
    }

    return this.Voice.getSpeechRecognitionServices();
  }

  isRecognizing(): Promise<boolean> {
    return new Promise((resolve) => {
      this.Voice.isRecognizing((isRecognizing: boolean) =>
        resolve(isRecognizing),
      );
    });
  }

  onSpeechStart(fn: (e: SpeechStartEvent) => void): EmitterSubscription {
    return this.addListenerToEvent(
      VoiceEventType.onSpeechStart,
      (e: SpeechStartEvent) => {
        if (this._listenForTimeoutID !== null) {
          clearTimeout(this._listenForTimeoutID);
          this._listenForTimeoutID = null;
        }
        if (this.options.listenFor > 0) {
          this._listenForTimeoutID = setTimeout(
            () => this.stop(),
            this.options.listenFor,
          );
        }
        fn(e);
      },
    );
  }

  onSpeechRecognized(
    fn: (e: SpeechRecognizedEvent) => void,
  ): EmitterSubscription {
    return this.addListenerToEvent(VoiceEventType.onSpeechRecognized, (e) =>
      fn(e),
    );
  }

  onSpeechEnd(fn: (e: SpeechEndEvent) => void): EmitterSubscription {
    return this.addListenerToEvent(
      VoiceEventType.onSpeechEnd,
      (e: SpeechEndEvent) => {
        this.clearAllTimeout();
        fn(e);
      },
    );
  }
  onSpeechError(fn: (e: SpeechErrorEvent) => void): EmitterSubscription {
    return this.addListenerToEvent(
      VoiceEventType.onSpeechError,
      (e: SpeechErrorEvent) => {
        this.clearAllTimeout();
        fn(e);
      },
    );
  }
  onSpeechResults(fn: (e: SpeechResultsEvent) => void): EmitterSubscription {
    return this.addListenerToEvent(
      VoiceEventType.onSpeechResults,
      (e: SpeechResultsEvent) => {
        if (this._preventNextResult) {
          this._preventNextResult = false;
          return;
        }
        fn(e);
      },
    );
  }
  onSpeechPartialResults(
    fn: (e: SpeechResultsEvent) => void,
  ): EmitterSubscription {
    return this.addListenerToEvent(
      VoiceEventType.onSpeechPartialResults,
      (e: SpeechResultsEvent) => {
        if (this._pauseForTimeoutID !== null) {
          clearTimeout(this._pauseForTimeoutID);
          this._pauseForTimeoutID = null;
        }
        if (this.options.pauseFor > 0) {
          this._pauseForTimeoutID = setTimeout(
            () => this.stopAndPreventNextResultiOS(),
            this.options.pauseFor,
          );
        }
        fn(e);
      },
    );
  }
  onSpeechVolumeChanged(fn: (e: SpeechVolumeChangeEvent) => void) {
    return this.addListenerToEvent(VoiceEventType.onSpeechVolumeChanged, (e) =>
      fn(e),
    );
  }

  private addListenerToEvent(
    type: VoiceEventType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (event: any) => void,
  ): EmitterSubscription {
    if (this._voiceEmitter === null) {
      throw new Error('Voice Emitter is not defined');
    }
    return this._voiceEmitter.addListener(type, listener);
  }

  /**
   * After stop(); iOS send again the last detection
   * Prevent dispatching twice the result after ending with pauseFor timeout
   */
  private stopAndPreventNextResultiOS = () => {
    if (Platform.OS === 'ios') {
      console.log('stopAndPreventNextResultiOS');
      this._preventNextResult = true;
    }
    this.stop();
  };

  private clearAllTimeout() {
    if (this._pauseForTimeoutID !== null) {
      clearTimeout(this._pauseForTimeoutID);
      this._pauseForTimeoutID = null;
    }
    if (this._listenForTimeoutID !== null) {
      clearTimeout(this._listenForTimeoutID);
      this._listenForTimeoutID = null;
    }
  }
}

export {
  SpeechEndEvent,
  SpeechErrorEvent,
  SpeechEvents,
  SpeechStartEvent,
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechVolumeChangeEvent,
};
export const Voice = new RCTVoice();
