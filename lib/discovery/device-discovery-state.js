"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * State of discovery for a DeviceDiscoverySession or DeviceDiscoveryManager
 */
var DeviceDiscoveryState;
(function (DeviceDiscoveryState) {
    /**
     * Initial, no discovery has been performed
     */
    DeviceDiscoveryState[DeviceDiscoveryState["Initial"] = 0] = "Initial";
    /**
     * Bluetooth is unavailable, such as the case when the radio is powered down
     */
    DeviceDiscoveryState[DeviceDiscoveryState["BluetoothUnavailable"] = 1] = "BluetoothUnavailable";
    /**
     * Bluetooth is available and discover can start
     */
    DeviceDiscoveryState[DeviceDiscoveryState["Ready"] = 16] = "Ready";
    /**
     * Actively discovering devices
     */
    DeviceDiscoveryState[DeviceDiscoveryState["Discovering"] = 17] = "Discovering";
})(DeviceDiscoveryState = exports.DeviceDiscoveryState || (exports.DeviceDiscoveryState = {}));
