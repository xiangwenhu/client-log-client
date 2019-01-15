"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AgoraRTCClient_1 = require("./AgoraRTCClient");
let _instance = null;
const APP_ID = window.$$ENV.AGORA_APP_ID;
async function default_1() {
    try {
        if (_instance) {
            return _instance;
        }
        const client = new AgoraRTCClient_1.default(APP_ID);
        // 初始化
        await client.init();
        _instance = client;
        return client;
    } catch (err) {
        console.log("创建RTC客户端出错", err);
        return null;
    }
}
exports.default = default_1;
