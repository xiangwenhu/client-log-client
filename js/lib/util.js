"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 * @param {String} kind audioinput|audiooutput|videoinput|*
 */
function getDevices(kind = '*') {
    const { AgoraRTC } = window;
    if (!AgoraRTC || !AgoraRTC.getDevices) {
        return Promise.resolve([]);
    }
    return new Promise((resolve, reject) => {
        AgoraRTC.getDevices((devices = []) => {
            const ds = devices.filter(device => {
                return kind === '*' ? true : device.kind === kind;
            }).map(device => {
                return {
                    kind: device.kind,
                    label: device.label,
                    deviceId: device.deviceId
                };
            });
            resolve(ds);
        });
    });
}
exports.getDevices = getDevices;
function removeAllListeners(emitter) {
    if (emitter && emitter.eventNames && emitter.removeAllListeners) {
        emitter.eventNames().forEach((eventName) => {
            emitter.removeAllListeners(eventName);
        });
    }
}
exports.removeAllListeners = removeAllListeners;
