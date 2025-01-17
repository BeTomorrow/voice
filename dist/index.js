"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const invariant_1 = __importDefault(require("invariant"));
const react_native_1 = require("react-native");
const Voice = react_native_1.NativeModules.Voice;
// NativeEventEmitter is only availabe on React Native platforms, so this conditional is used to avoid import conflicts in the browser/server
const voiceEmitter = react_native_1.Platform.OS !== 'web' ? new react_native_1.NativeEventEmitter(Voice) : null;
class RCTVoice {
    constructor() {
        this._preventNextResult = false;
        /**
         * After stop(); iOS send again the last detection
         * Prevent dispatching twice the result after ending with pauseFor timeout
         */
        this.stopAndPreventNextResultiOS = () => {
            if (react_native_1.Platform.OS === 'ios') {
                this._preventNextResult = true;
            }
            this.stop();
        };
        this._loaded = false;
        this._listeners = null;
        this._events = {
            onSpeechStart: () => { },
            onSpeechRecognized: () => { },
            onSpeechEnd: () => { },
            onSpeechError: () => { },
            onSpeechResults: () => { },
            onSpeechPartialResults: () => { },
            onSpeechVolumeChanged: () => { },
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
        return new Promise((resolve, reject) => {
            Voice.destroySpeech((error) => {
                if (error) {
                    reject(new Error(error));
                }
                else {
                    if (this._listeners) {
                        this._listeners.map((listener) => listener.remove());
                        this._listeners = null;
                    }
                    resolve();
                }
            });
        });
    }
    start(locale, options) {
        if (!this._loaded && !this._listeners && voiceEmitter !== null) {
            this._listeners = Object.keys(this._events).map((key) => voiceEmitter.addListener(key, this._events[key]));
        }
        this.options = Object.assign(Object.assign({}, this.options), options);
        return new Promise((resolve, reject) => {
            const callback = (error) => {
                if (error) {
                    reject(new Error(error));
                }
                else {
                    resolve();
                }
            };
            if (react_native_1.Platform.OS === 'android') {
                Voice.startSpeech(locale, {
                    EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
                    EXTRA_MAX_RESULTS: 5,
                    EXTRA_PARTIAL_RESULTS: true,
                    REQUEST_PERMISSIONS_AUTO: true,
                }, callback);
            }
            else {
                Voice.startSpeech(locale, {}, callback);
            }
        });
    }
    stop() {
        if (!this._loaded && !this._listeners) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this.clearAllTimeout();
            Voice.stopSpeech((error) => {
                if (error) {
                    reject(new Error(error));
                }
                else {
                    resolve();
                }
            });
        });
    }
    cancel() {
        if (!this._loaded && !this._listeners) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            Voice.cancelSpeech((error) => {
                if (error) {
                    reject(new Error(error));
                }
                else {
                    resolve();
                }
            });
        });
    }
    isAvailable() {
        return new Promise((resolve, reject) => {
            Voice.isSpeechAvailable((isAvailable, error) => {
                if (error) {
                    reject(new Error(error));
                }
                else {
                    resolve(isAvailable);
                }
            });
        });
    }
    /**
     * (Android) Get a list of the speech recognition engines available on the device
     * */
    getSpeechRecognitionServices() {
        if (react_native_1.Platform.OS !== 'android') {
            invariant_1.default(Voice, 'Speech recognition services can be queried for only on Android');
            return;
        }
        return Voice.getSpeechRecognitionServices();
    }
    isRecognizing() {
        return new Promise((resolve) => {
            Voice.isRecognizing((isRecognizing) => resolve(isRecognizing));
        });
    }
    set onSpeechStart(fn) {
        this._events.onSpeechStart = (e) => {
            if (this._listenForTimeoutID !== null) {
                clearTimeout(this._listenForTimeoutID);
                this._listenForTimeoutID = null;
            }
            if (this.options.listenFor > 0) {
                this._listenForTimeoutID = setTimeout(() => this.stop(), this.options.listenFor);
            }
            fn(e);
        };
    }
    set onSpeechRecognized(fn) {
        this._events.onSpeechRecognized = fn;
    }
    set onSpeechEnd(fn) {
        this._events.onSpeechEnd = (e) => {
            this.clearAllTimeout();
            fn(e);
        };
    }
    set onSpeechError(fn) {
        this._events.onSpeechError = (e) => {
            this.clearAllTimeout();
            fn(e);
        };
    }
    set onSpeechResults(fn) {
        this._events.onSpeechResults = (e) => {
            if (this._preventNextResult) {
                this._preventNextResult = false;
                return;
            }
            fn(e);
        };
    }
    set onSpeechPartialResults(fn) {
        this._events.onSpeechPartialResults = (e) => {
            if (this._pauseForTimeoutID !== null) {
                clearTimeout(this._pauseForTimeoutID);
                this._pauseForTimeoutID = null;
            }
            if (this.options.pauseFor > 0) {
                this._pauseForTimeoutID = setTimeout(() => this.stopAndPreventNextResultiOS(), this.options.pauseFor);
            }
            fn(e);
        };
    }
    set onSpeechVolumeChanged(fn) {
        this._events.onSpeechVolumeChanged = fn;
    }
    clearAllTimeout() {
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
exports.default = new RCTVoice();
