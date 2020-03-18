"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const check = require("check-types");
const createDebugLogger = require("debug");
const events_1 = require("events");
const defaults_1 = require("../defaults");
const ortho_remote_gatt_1 = require("./ortho-remote-gatt");
const ortho_remote_gatt_2 = require("./ortho-remote-gatt");
const midi_data_1 = require("../midi/midi-data");
const ortho_remote_communication_error_1 = require("../errors/ortho-remote-communication-error");
const ortho_remote_connection_status_1 = require("./ortho-remote-connection-status");
const ortho_remote_gatt_3 = require("./ortho-remote-gatt");
const midi_message_1 = require("../midi/midi-message");
// Create debug logger
const debug = createDebugLogger('orthoRemote/bluetooth');
// MIDI Values
const BUTTON_KEY = 0b00111100;
const MODULATION_WHEEL_CONTROL = 0x1;
// Number of steps in modulation control
const MODULATION_WHEEL_STEPS = 0x7F;
/**
 * Peripheral name of an Ortho Remote
 */
const OrthoRemotePeripheralName = 'ortho remote';
/**
 * A Ortho Remote bluetooth peripheral from Tenage Engineering
 * @internal
 */
class OrthoRemotePeripheral extends events_1.EventEmitter {
    /**
     * @param peripheral - bluetooth peripheral representing the device
     */
    constructor(peripheral) {
        super();
        /**
         * State of connection to a peripheral (mutable)
         */
        this.internalConnectedState = ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Disconnected;
        /**
         * Cached battery level
         */
        this.internalBatteryLevel = 100;
        if (peripheral.advertisement.localName !== OrthoRemotePeripheralName) {
            throw new TypeError('OrthoRemotePeripheral(peripheral) does not represent a Ortho Remote device');
        }
        this.internalPeripheral = peripheral;
    }
    //
    // Public properties
    //
    /**
     * Indicates if the peripheral is connected and usable
     * @event 'connected'
     * @event 'disconnected'
     */
    get isConnected() {
        return this.connectedState === ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Connected;
    }
    /**
     * Connection state of the peripheral
     * @event 'connected'
     * @event 'disconnected'
     */
    get connectedState() {
        return this.internalConnectedState;
    }
    /**
     * Peripheral ID
     */
    get id() {
        return this.internalPeripheral.id;
    }
    /**
     * RSSI of bluetooth connection to the peripheral, or undefined when not connected
     * @event 'rssi'
     */
    get rssi() {
        if (this.connectedState === ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Connected) {
            return this.internalPeripheral.rssi;
        }
        return undefined;
    }
    /**
     * Peripheral battery level
     * @event 'batteryLevel'
     */
    get batteryLevel() {
        if (this.connectedState === ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Connected) {
            return this.internalBatteryLevel;
        }
        return undefined;
    }
    //
    // Public functions
    //
    /**
     * Disconnects cleanly from the device
     * @emit 'disconnect'
     */
    disconnect() {
        this.internalPeripheral.removeAllListeners();
        this.internalPeripheral.disconnect();
        this.internalConnectedState = ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Disconnected;
        this.emit('disconnect');
    }
    /**
     * Underlying bluetooth peripheral
     */
    get peripheral() {
        return this.internalPeripheral;
    }
    /**
     * Sets a new peripheral to preprent the Ortho Remote device
     * This may attempt a reconnect if a connection was prior lost
     *
     * @param peripheral - bluetooth peripheral representing the device
     */
    set peripheral(peripheral) {
        if (peripheral.advertisement.localName !== OrthoRemotePeripheralName) {
            throw new TypeError('peripheral(peripheral) does not represent a Ortho Remote device');
        }
        if (peripheral !== this.internalPeripheral) {
            const wasConnected = this.isConnected;
            const oldPeripheral = this.internalPeripheral;
            if (oldPeripheral) {
                oldPeripheral.removeAllListeners();
                oldPeripheral.disconnect();
            }
            this.internalConnectedState = ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Disconnected;
            this.internalPeripheral = oldPeripheral;
            // If the device was connected, event the disconnect
            if (wasConnected) {
                this.emit('disconnect');
            }
        }
    }
    /**
     * Connects to the device, if not already connected
     *
     * @return `true` if the peripheral was connected to
     */
    connect() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // Check there still is an associated peripheral
            if (!this.internalPeripheral) {
                throw new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.NotAvailable, this.id);
            }
            return yield this.connectToPeriperal();
        });
    }
    /**
     * Sets the Ortho Remote modulation wheel value
     *
     * @param modulation - modulation value
     *
     * @return `true` if the value was written successfully
     */
    setModulation(modulation) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!check.inRange(modulation, 0, MODULATION_WHEEL_STEPS)) {
                throw new TypeError(`setModulation(modulation) should be between 0-${MODULATION_WHEEL_STEPS}`);
            }
            this.connectionRequiredToProceed();
            const midiService = this.internalPeripheral.services.find(service => service.uuid === ortho_remote_gatt_3.PeripheralService.BleMidi);
            if (midiService) {
                const midiCharacteristic = midiService.characteristics
                    .find(characteristic => characteristic.uuid === ortho_remote_gatt_2.BleMidiServiceCharacteristic.MidiDataIO);
                if (midiCharacteristic) {
                    return new Promise((resolve, reject) => {
                        midiCharacteristic.write(midi_data_1.toMidiDataPacket({
                            timestamp: Date.now(),
                            channel: 0,
                            message: midi_message_1.MidiMessage.ControlChange,
                            data: new Uint8Array([MODULATION_WHEEL_CONTROL, modulation]),
                        }), true, (err) => {
                            if (!err) {
                                resolve(true);
                            }
                            else {
                                reject(new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Bluetooth, this.id, err));
                            }
                        });
                    });
                }
            }
            return false;
        });
    }
    //
    // Private functions
    //
    /**
     * Connects to a peripheral
     * @emit 'connect'
     */
    connectToPeriperal() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            debug(`Connecting to device ${this.id}`);
            if (this.connectedState !== ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Disconnected) {
                return this.pendingConnection;
            }
            const peripheral = this.peripheral;
            if (!peripheral.connectable) {
                throw new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.NotConnectable, this.id);
            }
            // About to attempt connection
            this.internalConnectedState = ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Connecting;
            this.pendingConnection = new Promise((resolve, reject) => {
                // Set up a connection timeout timer in case connection does not succeed
                let timeout = false;
                const timeoutTimer = setTimeout(() => {
                    timeout = true;
                    // If the periperal is differnet, it was an aborted connection
                    if (peripheral !== this.internalPeripheral) {
                        reject(new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Disconnected, this.id));
                        return;
                    }
                    // Disconnected
                    this.disconnect();
                    this.internalConnectedState = ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Disconnected;
                    reject(new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.ConnectionTimeout, this.id));
                }, defaults_1.DEVICE_CONNECT_TIMEOUT_MS * 1000);
                // When connected
                peripheral.once('connect', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    clearTimeout(timeoutTimer);
                    if (timeout) {
                        return;
                    }
                    // Make sure we are connecting to the right device
                    if (peripheral !== this.internalPeripheral) {
                        reject(new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Disconnected, this.id));
                        return;
                    }
                    // Now connected
                    this.internalConnectedState = ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Connected;
                    // Now connected, listen for disconnects
                    peripheral.on('disconnect', () => {
                        if (peripheral === this.internalPeripheral) {
                            debug(`Disconnected from device ${this.id}`);
                            this.disconnect();
                        }
                    });
                    peripheral.on('rssiUpdate', () => {
                        this.emit('rssi', this.rssi);
                    });
                    // Begin service discovery...
                    const services = yield new Promise((resolveService, rejectServices) => {
                        peripheral.discoverServices([], (err, discoveredServices) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                            if (err) {
                                rejectServices(new Error(err));
                                return;
                            }
                            resolveService(discoveredServices);
                        }));
                    });
                    debug(`Discovered ${services.length} services on device ${peripheral.uuid}`);
                    // Make sure we are connecting to the right device
                    if (peripheral !== this.internalPeripheral) {
                        reject(new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Disconnected, this.id));
                        return;
                    }
                    // Characterisitic discovery...
                    yield Promise.all(services.map((service) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                        return new Promise((resolveCharacteristic, rejectCharacteristic) => {
                            service.discoverCharacteristics([], (err, characteristics) => {
                                if (err) {
                                    rejectCharacteristic(new Error(err));
                                    return;
                                }
                                resolveCharacteristic(characteristics);
                            });
                        });
                    })));
                    // Make sure we are connecting to the right device
                    if (peripheral !== this.internalPeripheral) {
                        reject(new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Disconnected, this.id));
                        return;
                    }
                    // All the characteristics should be cached now
                    const awaitBindings = [];
                    services.forEach(service => {
                        switch (service.uuid) {
                            case ortho_remote_gatt_3.PeripheralService.BatteryStatus:
                                awaitBindings.push(...this.bindToBatteryServiceCharacteristics(service, service.characteristics));
                                break;
                            case ortho_remote_gatt_3.PeripheralService.BleMidi:
                                awaitBindings.push(...this.bindToBleMidiServiceCharacteristics(service, service.characteristics));
                                break;
                        }
                    });
                    yield Promise.all(awaitBindings);
                    // Make sure we are connecting to the right device
                    if (peripheral !== this.internalPeripheral) {
                        reject(new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Disconnected, this.id));
                        return;
                    }
                    resolve(true);
                }));
                // Perform connection
                peripheral.connect((err) => {
                    clearTimeout(timeoutTimer);
                    if (timeout) {
                        return;
                    }
                    if (err) {
                        reject(new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Bluetooth, this.id, err));
                    }
                });
            });
            return this.pendingConnection.then((connected) => {
                if (connected) {
                    this.emit('connect');
                }
                return connected;
            });
        });
    }
    /**
     * Throws an error if the device is not fully connected, ensuring code following this call can operated on
     * a connected device.
     */
    connectionRequiredToProceed() {
        switch (this.connectedState) {
            case ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Connected:
                return;
            case ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Connecting:
                throw new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.NotConnected, this.id);
            case ortho_remote_connection_status_1.OrthoRemotePeriperalConnectedStatus.Disconnected:
                throw new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Disconnected, this.id);
        }
    }
    /**
     * Subscribes to a characteristic with a notify handler
     *
     * @param characteristic - characteristic to subscribe to
     * @param handler - handler to be called when the characteristic value changes
     *
     * @return Promise to capture when subscription has succeeded
     */
    bindCharacterNotifyHandler(characteristic, handler) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            debug(`Subscribing to characteristic ${characteristic.name || characteristic.uuid}`);
            characteristic.on('data', (data, isNotification) => {
                if (isNotification) {
                    handler(data, characteristic);
                }
            });
            return new Promise((resolve, reject) => {
                characteristic.subscribe((error) => {
                    if (error) {
                        debug(`Device ${this.id} error: ${error}`);
                        const deviceError = new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Bluetooth, this.id, error);
                        this.emit('error', deviceError);
                        reject(deviceError);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
        });
    }
    /**
     * Subscribes to characteristics of the battery status service
     *
     * @param service - service the characteristic is a member of
     * @param characteristics - characteristics to subscribe to
     *
     * @return Promise to capture when all subscriptions have succeeded
     */
    bindToBatteryServiceCharacteristics(service, characteristics) {
        const awaitBindings = [];
        for (const characteristic of characteristics) {
            switch (characteristic.uuid) {
                case ortho_remote_gatt_1.BatteryStatusServiceCharacteristic.BatteryLevel:
                    awaitBindings.push(this.bindCharacterNotifyHandler(characteristic, this.onBatteryLevelNotify.bind(this)));
                    // Read the battery level and add the read to the awaitingBindings so the battery level is set
                    // before the connection is established
                    awaitBindings.push(new Promise((resolve) => {
                        characteristic.read((error, data) => {
                            if (error) {
                                debug(`Device ${this.id} error: ${error}`);
                                const deviceError = new ortho_remote_communication_error_1.OrthoRemoteCommunicationError(ortho_remote_communication_error_1.OrthoRemoteCommunicationErrorCode.Bluetooth, this.id, error);
                                this.emit('error', deviceError);
                                // Do not reject
                                return;
                            }
                            this.onBatteryLevelNotify(data, characteristic);
                            resolve(true);
                        });
                    }));
                    break;
                default:
                    debug(`Unknown characteristic ${characteristic.name || characteristic.uuid}`);
            }
        }
        return awaitBindings;
    }
    /**
     * Subscribes to characteristics of the BLE-MIDI service
     *
     * @param service - service the characteristic is a member of
     * @param characteristics - characteristics to subscribe to
     *
     * @return Promise to capture when all subscriptions have succeeded
     */
    bindToBleMidiServiceCharacteristics(service, characteristics) {
        const awaitBindings = [];
        for (const characteristic of characteristics) {
            switch (characteristic.uuid) {
                case ortho_remote_gatt_2.BleMidiServiceCharacteristic.MidiDataIO:
                    awaitBindings.push(this.bindCharacterNotifyHandler(characteristic, this.onMidiDataIONotify.bind(this)));
                default:
                    debug(`Unknown characteristic ${characteristic.name || characteristic.uuid}`);
            }
        }
        // There is nothing to wait for, all UI subscriptions can come later
        return awaitBindings;
    }
    /**
     * Notify handler for BLE MIDI IO data
     *
     * @param data - MIDI data
     * @param characteristic - notification characteristic
     */
    onMidiDataIONotify(data, characteristic) {
        const midiPackets = midi_data_1.parseMidiDataPacket(data);
        if (midiPackets.length > 0) {
            const midiData = midiPackets[0];
            this.emit('midi', midiData, data);
            if (midiData.message === midi_message_1.MidiMessage.NoteOff) {
                const key = midiData.data[0] & 0x7F;
                if (key === BUTTON_KEY) {
                    this.emit('note', key, false);
                }
            }
            if (midiData.message === midi_message_1.MidiMessage.NoteOn) {
                const key = midiData.data[0] & 0x7F;
                if (key === BUTTON_KEY) {
                    this.emit('note', key, true);
                }
            }
            if (midiData.message === midi_message_1.MidiMessage.ControlChange) {
                const controller = midiData.data[0] & 0x7F;
                if (controller === MODULATION_WHEEL_CONTROL) {
                    const value = midiData.data[1] & 0x7F;
                    this.emit('modulation', value, OrthoRemotePeripheral.modulationSteps);
                }
            }
            debug(`Message: ${midiData.message.toString(2).padStart(8, '0')}`);
            debug(`Channel: ${midiData.channel.toString(2).padStart(8, '0')}`);
            debug(`Data 1: ${midiData.data[0].toString(2).padStart(8, '0')}`);
            debug(`Data 2: ${midiData.data[1].toString(2).padStart(8, '0')}`);
        }
    }
    /**
     * Notify handler for battery level changes
     *
     * @param data - characteristic data
     * @param characteristic - characteristic the data is for
     */
    onBatteryLevelNotify(data, characteristic) {
        this.internalBatteryLevel = data[0];
        this.emit('batteryLevel', data[0]);
    }
}
/**
 * Peripherial advertisement name
 */
OrthoRemotePeripheral.advertisementName = OrthoRemotePeripheralName;
/**
 * Number of steps supported by the modulation wheel
 */
OrthoRemotePeripheral.modulationSteps = MODULATION_WHEEL_STEPS;
exports.OrthoRemotePeripheral = OrthoRemotePeripheral;
