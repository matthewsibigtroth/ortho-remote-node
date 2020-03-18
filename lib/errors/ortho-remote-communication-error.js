"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ortho_remote_error_1 = require("./ortho-remote-error");
/**
 * Error code for connection class errors for a device
 */
var OrthoRemoteCommunicationErrorCode;
(function (OrthoRemoteCommunicationErrorCode) {
    /**
     * Unknown communication error
     */
    OrthoRemoteCommunicationErrorCode["Unknown"] = "unknown";
    /**
     * Device is no longer available and cannot be connected to
     */
    OrthoRemoteCommunicationErrorCode["NotAvailable"] = "notAvailable";
    /**
     * Device cannot be connected to, it may be connected to another device
     */
    OrthoRemoteCommunicationErrorCode["NotConnectable"] = "notConnectable";
    /**
     * Device is available but no connection has been established
     */
    OrthoRemoteCommunicationErrorCode["NotConnected"] = "notConnected";
    /**
     * Connection attempt timed out
     */
    OrthoRemoteCommunicationErrorCode["ConnectionTimeout"] = "timeout";
    /**
     * Device has been disconnected
     */
    OrthoRemoteCommunicationErrorCode["Disconnected"] = "disconnected";
    /**
     * Bluetooth communication related error
     */
    OrthoRemoteCommunicationErrorCode["Bluetooth"] = "bluetooth";
})(OrthoRemoteCommunicationErrorCode = exports.OrthoRemoteCommunicationErrorCode || (exports.OrthoRemoteCommunicationErrorCode = {}));
/**
 * Class of error related to device communication errors with a known device
 */
class OrthoRemoteCommunicationError extends ortho_remote_error_1.OrthoRemoteError {
    /**
     * @internal
     * @param code - connection error code
     * @param id - device ID for the connection error
     */
    constructor(code, id, message) {
        super(deviceCommunicatioErrorMessage(code, id, message), 'OrthoRemoteCommunicationErrorCode');
        this.code = code;
        this.id = id;
    }
}
exports.OrthoRemoteCommunicationError = OrthoRemoteCommunicationError;
//
// Private functions
//
/**
 * Helper function for generating connection error messages
 * @internal
 *
 * @param code - connection error code
 * @param id - device ID for the connection error
 * @param message - optional error mesage
 */
function deviceCommunicatioErrorMessage(code, id, message) {
    switch (code) {
        case OrthoRemoteCommunicationErrorCode.Bluetooth:
            if (message) {
                return `Bluetooth error on device ${id}: ${message}`;
            }
            return `Unknown bluetooth error on device ${id}`;
        case OrthoRemoteCommunicationErrorCode.ConnectionTimeout:
            if (message) {
                return `Connection timeout on device ${id}: ${message}`;
            }
            return `Connection timeout on device ${id}`;
        case OrthoRemoteCommunicationErrorCode.Disconnected:
            return `Device ${id} disconnected`;
        case OrthoRemoteCommunicationErrorCode.NotAvailable:
            return `Device ${id} is not available`;
        case OrthoRemoteCommunicationErrorCode.NotConnectable:
            return `Device ${id} cannot be connected to`;
        case OrthoRemoteCommunicationErrorCode.NotConnected:
            return `Communication with device ${id} is not yet ready, needs to be connected to`;
        case OrthoRemoteCommunicationErrorCode.Unknown:
            return `Unknown error on device ${id}`;
    }
}
