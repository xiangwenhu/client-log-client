"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CodeError extends Error {
    constructor({ message, code, data }) {
        super(message);
        this.name = "CodeError";
        this.code = code;
        this.data = data;
    }
}
exports.default = CodeError;
