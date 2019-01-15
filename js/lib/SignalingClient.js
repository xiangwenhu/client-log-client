"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventemitter3_1 = require("events");
const CodeError_1 = require("./CodeError");
const util_1 = require("./util");
class SignalingClient {
    constructor(appId, appcertificate) {
        this._appId = appId;
        this._appcert = appcertificate;
        // Init signal using signal sdk
        this.signal = window.Signal(appId);
        this.session = null; // session
        this.call = null; // call
        this.channel = null;
        this.channelName = null;
        // init event emitter for channel/session/call
        this.channelEmitter = new eventemitter3_1();
        this.sessionEmitter = new eventemitter3_1();
        this.callEmitter = new eventemitter3_1();
    }
    /**
     * @description login agora signaling server and init 'session'
     * @description use sessionEmitter to resolve session's callback
     * @param {String} account
     * @param {*} token default to be omitted
     * @returns {Promise}
     */
    login(account = null, token = "_no_need_token", reconnect_count = 10, reconnect_time = 30) {
        // this.account = account;
        return new Promise((resolve, reject) => {
            this.session = this.signal.login(account, token, reconnect_count, reconnect_time);
            // Proxy callback on session to sessionEmitter
            [
                "onLoginSuccess",
                "onError",
                "onLoginFailed",
                "onLogout",
                "onMessageInstantReceive",
                "onInviteReceived"
            ].map(event => {
                return (this.session[event] = (...args) => {
                    this.sessionEmitter.emit(event, ...args);
                });
            });
            // Promise.then
            this.sessionEmitter.once("onLoginSuccess", uid => {
                this.userId = account;
                resolve(uid);
            });
            // Promise.catch
            this.sessionEmitter.once("onLoginFailed", code => {
                this.userId = null;
                reject(new CodeError_1.default({
                    code,
                    message: "信令登录失败"
                }));
            });
        });
    }
    invite(channel, peer, message) {
        return new Promise((resolve, reject) => {
            this.call = this.session.channelInviteUser2(peer, channel, message);
            [
                "onInviteReceivedByPeer",
                "onInviteAcceptedByPeer",
                "onInviteRefusedByPeer",
                "onInviteFailed",
                "onInviteEndByPeer",
                "onInviteEndByMyself",
                "onInviteMsg"
            ].map(event => {
                return (this.call[event] = (...args) => {
                    this.callEmitter.emit(event, ...args);
                });
            });
            this.callEmitter.once("onInviteFailed", extra => {
                reject(new CodeError_1.default({
                    message: "信令邀请失败",
                    data: extra
                }));
            });
        });
    }
    /**
     * @description logout agora signaling server
     * @returns {Promise}
     */
    logout() {
        return new Promise((resolve, reject) => {
            this.session.logout();
            this.sessionEmitter.once("onLogout", (...args) => {
                // TODO:: check
                delete this.channel;
                resolve(...args);
            });
        });
    }
    safeLogout() {
        const { session } = this;
        if (session && session.state === 2 && session.logout) {
            return this.logout();
        }
        return Promise.resolve(false);
    }
    /**
     * @description join channel
     * @description use channelEmitter to resolve channel's callback
     * @param {String} channel
     * @returns {Promise}
     */
    join(channel) {
        this.channelName = channel;
        return new Promise((resolve, reject) => {
            if (!this.session) {
                reject(new CodeError_1.default({
                    message: "在加入channal之前必须先初始化session"
                }));
                return;
            }
            this.channel = this.session.channelJoin(channel);
            [
                "onChannelJoined",
                "onChannelJoinFailed",
                "onChannelLeaved",
                "onChannelUserJoined",
                "onChannelUserLeaved",
                "onChannelUserList",
                "onChannelAttrUpdated",
                "onMessageChannelReceive"
            ].map(event => {
                return (this.channel[event] = (...args) => {
                    if (event === "onMessageChannelReceive") {
                        console.log("广播消息:收到", ...args);
                    }
                    this.channelEmitter.emit(event, ...args);
                });
            });
            // Promise.then
            this.channelEmitter.once("onChannelJoined", (...args) => {
                console.log("加入信令频道成功", this.channel.name);
                resolve(...args);
            });
            // Promise.catch
            this.channelEmitter.once("onChannelJoinFailed", code => {
                this.channelEmitter.removeAllListeners();
                reject(new CodeError_1.default({
                    code,
                    message: "加入channel失败"
                }));
            });
        });
    }
    /**
     * @description leave channel
     * @returns {Promise}
     */
    leave() {
        return new Promise((resolve, reject) => {
            try {
                if (this.channel) {
                    this.channel.channelLeave();
                    this.channelEmitter.once("onChannelLeaved", (...args) => {
                        console.log("离开信令频道成功", this.channel.name);
                        //TODO:: check
                        this.channel = null;
                        this.removeAllListeners("channel");
                        resolve(...args);
                    });
                    setTimeout(() => {
                        reject("退出信令频道异常");
                    }, 350);
                }
                else {
                    resolve();
                }
            }
            catch (err) {
                reject("离开信令频道发生异常");
            }
        });
    }
    removeAllListeners(type = "channel") {
        const emitter = this[`${type}Emitter`];
        if (emitter) {
            util_1.removeAllListeners(emitter);
        }
    }
    setUserAttr(name, value) {
        const { channel } = this;
        if (!name || !value) {
            return Promise.reject(new CodeError_1.default({
                message: "用户属性键或者值不能为空"
            }));
        }
        if (!channel) {
            return Promise.reject(new CodeError_1.default({
                message: "未加入任何信令渠道"
            }));
        }
        const val = typeof value === "string" ? value : JSON.stringify(value);
        console.log("信令消息：提交自身属性", val);
        return this.invoke("io.agora.signal.user_set_attr", {
            name,
            value: val
        });
    }
    getUserAttr(account, name) {
        return this.invoke("io.agora.signal.user_get_attr", {
            account,
            name
        });
    }
    getUserAtrrAll(account) {
        return this.invoke("io.agora.signal.user_get_attr_all", { account });
    }
    queryUserList() {
        return this.invoke("io.agora.signal.channel_query_userlist", {
            name: this.channelName
        });
    }
    /**
     * @description send p2p message
     * @description if you want to send an object, use JSON.stringify
     * @param {String} peerAccount
     * @param {String} text
     */
    sendMessage(peerAccount, text) {
        const message = this._parseMessage(text);
        if (!message) {
            return Promise.reject(new CodeError_1.default({
                message: "不能发送空消息"
            }));
        }
        return new Promise((resolve, reject) => {
            if (this.session) {
                this.session.messageInstantSend(peerAccount, message, () => {
                    console.log('成功发送消息', message)
                    resolve();
                });
            }
            else {
                reject({
                    message: "信令session不存在"
                });
            }
        });
    }
    /**
     * @description broadcast message in the channel
     * @description if you want to send an object, use JSON.stringify
     * @param {String} text
     */
    broadcastMessage(text) {
        const message = this._parseMessage(text);
        if (!message) {
            return Promise.reject(new CodeError_1.default({
                message: "不能发送空消息"
            }));
        }
        console.log("广播消息：发送", message, this.channel);
        this.channel && this.channel.messageChannelSend(message);
    }
    invoke(func, args) {
        let session = this.session;
        if (session) {
            return new Promise((resolve, reject) => {
                session.invoke(func, args, function (err, val) {
                    if (err) {
                        reject(new CodeError_1.default({
                            message: err.reason
                        }));
                    }
                    else {
                        resolve(val);
                    }
                });
            });
        }
        else {
            return Promise.reject(new CodeError_1.default({
                message: "session不存在"
            }));
        }
    }
    /** -----私有方法----- */
    _isEmptyMessage(message) {
        if (message == null ||
            ((typeof message === "string" || message instanceof String) &&
                message.trim() === "")) {
            return true;
        }
        return false;
    }
    _parseMessage(message) {
        try {
            if (this._isEmptyMessage(message)) {
                return null;
            }
            if (typeof message === "string" || message instanceof String) {
                return message;
            }
            return JSON.stringify(message);
        }
        catch (err) {
            return null;
        }
    }
}
exports.default = SignalingClient;
