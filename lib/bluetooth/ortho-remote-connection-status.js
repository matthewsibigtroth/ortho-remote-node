"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Connection status of a Ortho Remote peripheral
 * @internal
 */
var OrthoRemotePeriperalConnectedStatus;
(function (OrthoRemotePeriperalConnectedStatus) {
    /**
     * Disconnected
     */
    OrthoRemotePeriperalConnectedStatus["Disconnected"] = "disconnected";
    /**
     * Connecting and discovering services/characteristics, not yet usable
     */
    OrthoRemotePeriperalConnectedStatus["Connecting"] = "connecting";
    /**
     * Connected, all services/characteristic subscribed to
     */
    OrthoRemotePeriperalConnectedStatus["Connected"] = "connected";
})(OrthoRemotePeriperalConnectedStatus = exports.OrthoRemotePeriperalConnectedStatus || (exports.OrthoRemotePeriperalConnectedStatus = {}));
