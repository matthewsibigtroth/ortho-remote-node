"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const events_1 = require("events");
const ortho_remote_peripheral_1 = require("./bluetooth/ortho-remote-peripheral");
// Interval to be classified as long-click
const LONG_CLICK_INTERVAL_MS = 400;
// Default rotation on connect (always center)
const DEFAULT_ROTATION = Math.floor(ortho_remote_peripheral_1.OrthoRemotePeripheral.modulationSteps / 2);
/**
 * A Ortho Remote device client for interacting with BT Ortho Remote peripheral from Teenage Engineering
 */
class OrthoRemote extends events_1.EventEmitter {
    /**
     * @internal
     * @param peripheral - bluetooth peripheral representing the Ortho Remote
     */
    constructor(peripheral) {
        super();
        /**
         * Ortho Remote configuration
         */
        this.configuration = {
            // delayEvents: true,
            normalizeData: true,
        };
        /**
         * Rotation of the dial
         * @internal
         */
        this.internalRotation = DEFAULT_ROTATION;
        this.orthoRemotePeripheral = peripheral;
        this.bindToPeripheral(this.orthoRemotePeripheral);
    }
    //
    // Public properties
    //
    /**
     * Indicates if there is a connection established to the Ortho Remote device
     */
    get isConnected() {
        return this.orthoRemotePeripheral.isConnected;
    }
    /**
     * Ortho Remote device identifier
     */
    get id() {
        return this.orthoRemotePeripheral.id;
    }
    /**
     * Ortho Remote device battery level
     * @event batteryLevel
     */
    get batteryLevel() {
        return this.orthoRemotePeripheral.batteryLevel;
    }
    /**
     * Ortho Remote device RSSI
     * @event rssi
     */
    get rssi() {
        return this.orthoRemotePeripheral.rssi;
    }
    /**
     * Ortho Remote rotation value, can be between 0.0 - 1.0 (normalized) or 0 - 127 (raw)
     * @event rotation
     */
    get rotation() {
        const normalize = this.configuration.normalizeData;
        if (normalize !== false) {
            return (this.internalRotation / ortho_remote_peripheral_1.OrthoRemotePeripheral.modulationSteps);
        }
        return this.internalRotation;
    }
    //
    // Public functions
    //
    /**
     * Connects to the device, if not already connected
     * @event connect
     *
     * @param [config=] - `OrthoRemote` configuration
     *
     * @return a Promise with `true` to indicate a successful connection
     */
    connect(config) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (config) {
                this.configuration = Object.assign({}, this.configuration, config);
            }
            const connected = yield this.orthoRemotePeripheral.connect();
            if (connected) {
                this.emit('connect');
            }
            return connected;
        });
    }
    /**
     * Disconnects cleanly from the device
     *
     * @event disconnect
     */
    disconnect() {
        this.orthoRemotePeripheral.disconnect();
    }
    //
    // Private functions
    //
    /**
     * Binds to a `OrthoRemotePeripheral` device's events
     * @internal
     *
     * @param peripheral - peripheral device to bind events to
     */
    bindToPeripheral(peripheral) {
        peripheral.on('disconnect', this.onDisconnect.bind(this));
        // Standard BLE
        peripheral.on('batteryLevel', () => this.emit('batteryLevel', this.batteryLevel));
        peripheral.on('rssi', () => this.emit('rssi', this.rssi));
        // Interactions
        peripheral.on('note', (key, on) => {
            if (on) {
                this.onButtonPressed();
            }
            else {
                this.onButtonReleased();
            }
        });
        peripheral.on('midi', (data, rawData) => this.emit('midi', data, rawData));
        peripheral.on('modulation', this.onRotate.bind(this));
        // Errors
        peripheral.on('error', this.onError.bind(this));
    }
    /** @internal */
    onButtonPressed() {
        this.buttonPressedTimestamp = Date.now();
        this.emit('buttonPressed');
    }
    /** @internal */
    onButtonReleased() {
        const startTimestamp = this.buttonPressedTimestamp;
        this.emit('buttonReleased');
        if (startTimestamp !== undefined) {
            this.buttonPressedTimestamp = undefined;
            const longClick = (Date.now() - startTimestamp) >= LONG_CLICK_INTERVAL_MS;
            this.emit(longClick ? 'longClick' : 'click');
        }
    }
    /** @internal */
    onDisconnect() {
        this.internalRotation = DEFAULT_ROTATION;
        this.buttonPressedTimestamp = undefined;
        this.emit('disconnect');
    }
    /** @internal */
    onError(error) {
        if (this.listenerCount('error') > 0) {
            this.emit('error', error);
        }
    }
    /** @internal */
    onRotate(normalized, raw) {
        this.internalRotation = normalized;
        const buttonPressed = !!this.buttonPressedTimestamp;
        this.emit('rotate', this.rotation, buttonPressed);
    }
}
exports.OrthoRemote = OrthoRemote;
