"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventemitter3_1 = require("events");
const CodeError_1 = require("./CodeError");
const util_1 = require("./util");
const { AgoraRTC } = window;
class AgoraRTCClient {
    constructor(
        appId,
        config = {
            mode: "live",
            codec: "vp8",
            attributes: {
                resolution: "hd720p"
            }
        }
    ) {
        this._appId = appId;
        this.client = AgoraRTC.createClient(config);
        this.channelEmitter = new eventemitter3_1();
        this.userId = null;
        this.stream = null;
    }
    init() {
        return new Promise((resolve, reject) => {
            this.client.init(
                this._appId,
                () => {
                    [
                        "stream-published",
                        "stream-added",
                        "stream-removed",
                        "stream-subscribed",
                        "peer-leave",
                        "mute-audio",
                        "unmute-audio",
                        "mute-video",
                        "unmute-video",
                        "client-banned",
                        "active-speaker",
                        "volume-indicator",
                        "liveStreamingStarted",
                        "liveStreamingFailed",
                        "lliveStreamingStopped",
                        "liveTranscodingUpdated",
                        "onTokenPrivilegeWillExpire",
                        "onTokenPrivilegeDidExpire",
                        "error",
                        "networkTypeChanged",
                        "recordingDeviceChanged",
                        "playoutDeviceChanged",
                        "cameraChanged",
                        "streamTypeChange"
                    ].forEach(eventName => {
                        this.client.on(eventName, ev => {
                            try {
                                switch (eventName) {
                                    case "error":
                                        console.log("RTC Client Error", ev);
                                        //this.safeLeave()
                                        break;
                                    default:
                                        break;
                                }
                                this.channelEmitter.emit(eventName, ev);
                            } catch (err) {
                                console.log(`${eventName}事件处理异常,${err}`);
                            }
                        });
                    });
                    resolve();
                },
                err => {
                    reject(
                        new CodeError_1.default({
                            message: err.message || "语音初始化失败"
                        })
                    );
                }
            );
        });
    }
    removeListener(eventName, fn) {
        if (typeof eventName === "string" && typeof fn === "function") {
            this.channelEmitter.removeListener(eventName, fn);
        }
    }
    removeAllListeners(eventName) {
        if (typeof eventName === "string") {
            this.channelEmitter.removeAllListeners(eventName);
        }
    }
    join(tokenOrKey = null, channel, uid) {
        const { client } = this;
        return new Promise((resolve, reject) => {
            client.join(
                tokenOrKey,
                channel,
                uid,
                userId => {
                    console.log("加入音频频道", channel);
                    this.userId = userId;
                    resolve(userId);
                },
                function(err) {
                    reject(err);
                }
            );
        });
    }

    startDeskStream(elementSelector, deskStream) {
        return new Promise((resolve, reject) => {
            const { userId, client } = this;
            const localStream = AgoraRTC.createStream({
                streamID: userId,
                audio: true,
                screen: false,
                video: true
            });
            this.stream = localStream;

            // The user has denied access to the camera and mic.
            localStream.on("accessDenied", () => {
                reject(
                    new CodeError_1.default({
                        code: 4001,
                        message: "获取本地媒体失败"
                    })
                );
            });
            localStream.init(
                () => {
                    localStream.replaceTrack(deskStream.getVideoTracks()[0]);
                    localStream.play(elementSelector);
                    client.publish(localStream, err => {
                        try {
                            this.stopStream();
                            reject(
                                new CodeError_1.default({
                                    code: 5001,
                                    message: "发布本地音频流失败" + err
                                })
                            );
                        } catch (err) {
                            reject(
                                new CodeError_1.default({
                                    code: 5001,
                                    message: "发布流失败，停止本地流异常"
                                })
                            );
                        }
                    });
                    client.on("stream-published", function(evt) {
                        localStream.published = true;
                        resolve();
                    });
                },
                function(err) {
                    reject(
                        new CodeError_1.default({
                            code: 4001,
                            message: "获取本地媒体失败"
                        })
                    );
                }
            );
        });
    }

    startStream(audioId, elementSelector) {
        return new Promise((resolve, reject) => {
            const { userId, client } = this;
            const localStream = AgoraRTC.createStream({
                streamID: userId,
                audio: true,
                microphoneId: audioId,
                screen: false
            });
            this.stream = localStream;
            /*
            localStream.on("accessAllowed", () => {

            }); */
            // The user has denied access to the camera and mic.
            localStream.on("accessDenied", () => {
                reject(
                    new CodeError_1.default({
                        code: 4001,
                        message: "获取本地媒体失败"
                    })
                );
            });
            localStream.init(
                () => {
                    localStream.play(elementSelector);
                    client.publish(localStream, err => {
                        try {
                            this.stopStream();
                            reject(
                                new CodeError_1.default({
                                    code: 5001,
                                    message: "发布本地音频流失败" + err
                                })
                            );
                        } catch (err) {
                            reject(
                                new CodeError_1.default({
                                    code: 5001,
                                    message: "发布流失败，停止本地流异常"
                                })
                            );
                        }
                    });
                    client.on("stream-published", function(evt) {
                        localStream.published = true;
                        resolve();
                    });
                },
                function(err) {
                    reject(
                        new CodeError_1.default({
                            code: 4001,
                            message: "获取本地媒体失败"
                        })
                    );
                }
            );
        });
    }
    restartStream(audioId, elementSelector) {
        if (!this.stream) {
            return Promise.resolve();
        }
        try {
            const { client } = this;
            if (this.stream.isPlaying() && this.stream.stop) {
                this.stream.stop();
            }
            client.unpublish(this.stream);
            const el = document.querySelector(elementSelector);
            if (el) {
                el.innerHTML = "";
            }
        } catch (err) {
            console.log("RTC restartStream err", err);
            return Promise.reject();
        }
        return this.startStream(audioId, elementSelector);
    }
    stopStream() {
        try {
            if (this.stream) {
                const { client } = this;
                this.stream.stop();
                if (this.stream.published) {
                    client.unpublish(this.stream);
                }
            }
        } catch (err) {
            console.log("停止流发生异常", err);
        }
    }
    leave() {
        const { client } = this;
        return new Promise((resolve, reject) => {
            client.leave(
                () => {
                    console.log("离开音频频道", client.channel);
                    util_1.removeAllListeners(this.channelEmitter);
                    client.stream = null;
                    resolve();
                },
                function(err) {
                    reject(err);
                }
            );
        });
    }
    safeJoin(tokenOrKey = null, channel, uid) {
        return this.leave().then(() => this.join(tokenOrKey, channel, uid));
    }
    safeLeave() {
        this.stopStream();
        return this.leave();
    }
    // 允许音频
    enableAudio() {
        this.stream && this.stream.enableAudio();
    }
    // 关闭音频
    disableAudio() {
        this.stream && this.stream.disableAudio();
    }
    /**
     * 设置声音大小
     * @param {Number} number
     */
    setAudioVolume(number) {
        this.stream && this.stream.setAudioVolume(number);
    }
    /**
     * 设置音频输出
     * @param {String} deviceId 设备 ID，可以通过 getDevices 获得，设备的 kind 属性应该为 "audiooutput"
     */
    setAudioOutput(deviceId) {
        return new Promise((resolve, reject) => {
            this.stream &&
                this.stream.setAudioOutput(deviceId, resolve, message =>
                    reject(
                        new CodeError_1.default({
                            message
                        })
                    )
                );
        });
    }
    /**
     * 获取当前音量
     */
    getAudioLevel() {
        return this.stream && this.stream.getAudioLevel();
    }
    /**
     * 切换媒体输入设备
     * @param {*} type 设备类型
     * @param {*} deviceId 设备id
     */
    switchDevice(type, deviceId) {
        return new Promise((resolve, reject) => {
            this.stream &&
                this.stream.switchDevice(type, deviceId, resolve, message =>
                    reject(
                        new CodeError_1.default({
                            message
                        })
                    )
                );
        });
    }
}
exports.default = AgoraRTCClient;
