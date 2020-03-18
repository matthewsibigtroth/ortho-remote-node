"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Generic error message for all Ortho Remote errors
 */
class OrthoRemoteError extends Error {
    /**
     * @internal
     * @param message - error message
     * @param name - name given to the error
     */
    constructor(message, name = 'OrthoRemoteError') {
        super(message);
        // Correct prototype overridden by Error
        // tslint:disable-next-line:no-unsafe-any
        Reflect.setPrototypeOf(this, new.target.prototype);
        this.name = name;
    }
}
exports.OrthoRemoteError = OrthoRemoteError;
