import invariant from 'invariant';
import {
  EmitterSubscription,
  NativeEventEmitter,
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
  VoiceModule,
} from './VoiceModuleTypes';

const Voice = NativeModules.Voice as VoiceModule;

// NativeEventEmitter is only availabe on React Native platforms, so this conditional is used to avoid import conflicts in the browser/server
const voiceEmitter =
  Platform.OS !== 'web' ? new NativeEventEmitter(Voice) : null;
type SpeechEvent = keyof SpeechEvents;

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
  _listeners: EmitterSubscription[] | null;
  _events: Required<SpeechEvents>;
  options: SpeechRecognizerOptions;
  _pauseForTimeoutID: NodeJS.Timeout | null;
  _listenForTimeoutID: NodeJS.Timeout | null;

  constructor() {
    this._loaded = false;
    this._listeners = null;
    this._events = {
      onSpeechStart: () => {},
      onSpeechRecognized: () => {},
      onSpeechEnd: () => {},
      onSpeechError: () => {},
      onSpeechResults: () => {},
      onSpeechPartialResults: () => {},
      onSpeechVolumeChanged: () => {},
    };
    this._pauseForTimeoutID = null;
    this._listenForTimeoutID = null;
    this.options = {
      pauseFor: 2500,
      listenFor: 0,
    };
  }

  removeAllListeners() {
    Voice.onSpeechStart = undefined;
    Voice.onSpeechRecognized = undefined;
    Voice.onSpeechEnd = undefined;
    Voice.onSpeechError = undefined;
    Voice.onSpeechResults = undefined;
    Voice.onSpeechPartialResults = undefined;
    Voice.onSpeechVolumeChanged = undefined;
  }

  destroy() {
    if (!this._loaded && !this._listeners) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      Voice.destroySpeech((error: string) => {
        if (error) {
          reject(new Error(error));
        } else {
          if (this._listeners) {
            this._listeners.map((listener) => listener.remove());
            this._listeners = null;
          }
          resolve();
        }
      });
    });
  }

  start(locale: string, options?: Partial<SpeechRecognizerOptions>) {
    if (!this._loaded && !this._listeners && voiceEmitter !== null) {
      this._listeners = (Object.keys(this._events) as SpeechEvent[]).map(
        (key: SpeechEvent) => voiceEmitter.addListener(key, this._events[key]),
      );
    }
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
        Voice.startSpeech(
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
        Voice.startSpeech(locale, {}, callback);
      }
    });
  }
  stop() {
    if (!this._loaded && !this._listeners) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this.clearAllTimeout();
      Voice.stopSpeech((error) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve();
        }
      });
    });
  }
  cancel() {
    if (!this._loaded && !this._listeners) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      Voice.cancelSpeech((error) => {
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
      Voice.isSpeechAvailable((isAvailable: boolean, error: string) => {
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
        Voice,
        'Speech recognition services can be queried for only on Android',
      );
      return;
    }

    return Voice.getSpeechRecognitionServices();
  }

  isRecognizing(): Promise<boolean> {
    return new Promise((resolve) => {
      Voice.isRecognizing((isRecognizing: boolean) => resolve(isRecognizing));
    });
  }

  set onSpeechStart(fn: (e: SpeechStartEvent) => void) {
    this._events.onSpeechStart = (e: SpeechStartEvent) => {
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
    };
  }

  set onSpeechRecognized(fn: (e: SpeechRecognizedEvent) => void) {
    this._events.onSpeechRecognized = fn;
  }
  set onSpeechEnd(fn: (e: SpeechEndEvent) => void) {
    this._events.onSpeechEnd = (e: SpeechEndEvent) => {
      this.clearAllTimeout();
      fn(e);
    };
  }
  set onSpeechError(fn: (e: SpeechErrorEvent) => void) {
    this._events.onSpeechError = (e: SpeechErrorEvent) => {
      this.clearAllTimeout();
      fn(e);
    };
  }
  set onSpeechResults(fn: (e: SpeechResultsEvent) => void) {
    this._events.onSpeechResults = fn;
  }
  set onSpeechPartialResults(fn: (e: SpeechResultsEvent) => void) {
    this._events.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (this._pauseForTimeoutID !== null) {
        clearTimeout(this._pauseForTimeoutID);
        this._pauseForTimeoutID = null;
      }
      if (this.options.pauseFor > 0) {
        this._pauseForTimeoutID = setTimeout(
          () => this.stop(),
          this.options.pauseFor,
        );
      }
      fn(e);
    };
  }
  set onSpeechVolumeChanged(fn: (e: SpeechVolumeChangeEvent) => void) {
    this._events.onSpeechVolumeChanged = fn;
  }

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
export default new RCTVoice();
