"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const createDebugLogger = require("debug");
const noble = require("noble");
const weak = require("weak");
const events_1 = require("events");
const device_discovery_session_1 = require("./device-discovery-session");
const device_discovery_state_1 = require("./device-discovery-state");
const ortho_remote_1 = require("../ortho-remote");
const ortho_remote_peripheral_1 = require("../bluetooth/ortho-remote-peripheral");
const debug = createDebugLogger('orthoRemote/discovery');
const debugBluetooth = createDebugLogger('orthoRemote/bluetooth');
/**
 * A device manager is the main entry for connecting to Ortho Remote devices. It offers device discovery and
 */
class DeviceDiscoveryManager extends events_1.EventEmitter {
    /**
     * There should be no need to construct a new device manager. Use `defaultManager`
     * @internal
     */
    constructor() {
        super();
        /**
         * Device discovery state
         * @internal
         */
        this.managerDiscoveryState = device_discovery_state_1.DeviceDiscoveryState.Initial;
        /**
         * Active discovery sessions
         * @internal
         */
        this.activeSessions = new Set();
        /**
         * All devices discovered, index by device ID
         * @internal
         */
        this.discoveredDevicesMap = new Map();
        /**
         * Indiciates if a discovery should be performed when the BT radio is powered on
         * @internal
         */
        this.discoverWhenPoweredOnRequested = false;
    }
    /**
     * Default device discovery manager to manage discovery of one or more Ortho Remote devices
     */
    static get defaultManager() {
        return new DeviceDiscoveryManager();
    }
    //
    // Public properties
    //
    /**
     * Active discovery state
     */
    get discoveryState() {
        return this.managerDiscoveryState;
    }
    /**
     * All discovered devices by the device manager
     */
    get discoveredDevices() {
        return [...this.discoveredDevicesMap.values()];
    }
    //
    // Public functions
    //
    /**
     * Start a new discovery session to discover Ortho Remote devices
     *
     * @param options - discovery session options
     * @return Session object initialized based on options and to observe discovery events on
     */
    startDiscoverySession(options) {
        // Initial discovery requires events to be registered
        if (this.managerDiscoveryState === device_discovery_state_1.DeviceDiscoveryState.Initial) {
            // TODO: Should we account for BT initialization for timeouts?
            this.initializeBluetooth();
            noble.on('discover', (peripheral) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const isOrthoRemote = (peripheral.advertisement.localName === ortho_remote_peripheral_1.OrthoRemotePeripheral.advertisementName);
                if (isOrthoRemote) {
                    debug(`Ortho Remote device found ${peripheral.uuid}`);
                    // Create a new device or pull the one from the cache
                    const existingDevice = this.discoveredDevicesMap.get(peripheral.uuid);
                    const device = existingDevice || new ortho_remote_1.OrthoRemote(new ortho_remote_peripheral_1.OrthoRemotePeripheral(peripheral));
                    if (existingDevice) {
                        device.orthoRemotePeripheral.peripheral = peripheral;
                    }
                    // Cache device using a weak reference
                    if (!existingDevice) {
                        const uuid = peripheral.uuid;
                        weak(device, () => {
                            const weakDevice = this.discoveredDevicesMap.get(uuid);
                            if (weak.isDead(weakDevice) || weak.isNearDeath(weakDevice)) {
                                this.discoveredDevicesMap.delete(uuid);
                            }
                        });
                        this.discoveredDevicesMap.set(peripheral.uuid, device);
                        // TODO: Auto-reconnect handling
                        // // Listen for connect/disconnect
                        // device.on('disconnect', (willAutoReconnect: boolean) => {
                        //     if (!willAutoReconnect) {
                        //         self.discoveredDevices.delete(uuid)
                        //     }
                        // })
                    }
                    // Emit event
                    this.emit('device', device, !!existingDevice);
                    // Allow each session to handle the device as appropriate
                    this.activeSessions.forEach((session) => {
                        session.onDeviceDiscovered(device, !!existingDevice);
                    });
                }
                else {
                    debug(`Other (non-Ortho Remote) device found '${peripheral.advertisement.localName}': ${peripheral.uuid}`);
                }
            }));
        }
        // Create new session and schedule
        const discoverySession = new device_discovery_session_1.DeviceDiscoverySession(this, options);
        this.activeSessions.add(discoverySession);
        // If we need to wait for bluetooth then schedule it
        if (this.managerDiscoveryState <= device_discovery_state_1.DeviceDiscoveryState.BluetoothUnavailable) {
            this.discoverWhenPoweredOnRequested = true;
            return discoverySession;
        }
        // Start discovery
        this.discoverDevices();
        return discoverySession;
    }
    /**
     * Stops and removes a session from the list of managed sessions.
     * When all session have been removed discovery will cease.
     *
     * Use `DeviceDiscoverySession.stop`
     *
     * @param session - session to remove
     */
    stopDiscoverySession(session) {
        if (this.activeSessions.has(session)) {
            this.activeSessions.delete(session);
        }
        // If there are no more session, end discovery
        if (this.activeSessions.size === 0 && this.managerDiscoveryState !== device_discovery_state_1.DeviceDiscoveryState.Ready) {
            this.stopDiscovery();
        }
    }
    /**
     * Stops _all_ discovery sessions in progress
     */
    stopDiscovery() {
        // If discovery has already been stopped, there is nothing to do
        if (this.managerDiscoveryState === device_discovery_state_1.DeviceDiscoveryState.Ready) {
            return;
        }
        noble.stopScanning();
        this.discoverWhenPoweredOnRequested = false;
        // Only if in discovery mode should the state change
        if (this.managerDiscoveryState >= device_discovery_state_1.DeviceDiscoveryState.Discovering) {
            this.managerDiscoveryState = device_discovery_state_1.DeviceDiscoveryState.Ready;
        }
        // Stop discovery on each session, removing it from the session pool
        this.activeSessions.forEach(session => {
            session.stopDiscovery(false);
        });
        // Add assert sessions.size === 0
        this.emit('stopped');
    }
    //
    // Private functions
    //
    /**
     * Initializes bluetooth on the host hardware, ensuring it's powered on before initiating discovery
     * @internal
     */
    initializeBluetooth() {
        // Only initialized if the discovery was never started
        if (this.managerDiscoveryState !== device_discovery_state_1.DeviceDiscoveryState.Initial) {
            return;
        }
        debug('Waiting for poweredOn state');
        this.managerDiscoveryState = device_discovery_state_1.DeviceDiscoveryState.BluetoothUnavailable;
        const onPowerStateChange = (state) => {
            debugBluetooth(`Bluetooth state: ${state}`);
            const poweredOn = state === 'poweredOn';
            if (poweredOn) {
                debug('Bluetooth powered on');
                debugBluetooth('Bluetooth powered on');
                // Awaiting discovery
                this.managerDiscoveryState = device_discovery_state_1.DeviceDiscoveryState.Ready;
                if (this.discoverWhenPoweredOnRequested) {
                    this.discoverDevices();
                }
            }
            else {
                debug('Bluetooth powered off');
                debugBluetooth('Bluetooth powered off');
                // Radio has been powered off
                const wasInDiscovery = this.managerDiscoveryState === device_discovery_state_1.DeviceDiscoveryState.Discovering;
                // Stop all discovery
                this.stopDiscovery();
                // If discovery was in progress, then request discovery again when BT is available
                if (wasInDiscovery) {
                    debug('Was in Discovering, will auto-resume on onPoweredOn');
                    this.managerDiscoveryState = device_discovery_state_1.DeviceDiscoveryState.BluetoothUnavailable;
                    this.discoverWhenPoweredOnRequested = true;
                }
                // // Allow each session to handle the device as appropriate
                // self.sessions.forEach(session => {
                //     session.handleDevice(device, !!existingDevice)
                // })
                // Disconnect all devices and reconnect when BT is available again
                this.discoveredDevices.forEach(device => {
                    device.disconnect();
                });
            }
        };
        // Listen for power state changes in the radio
        noble.on('stateChange', onPowerStateChange);
        // Check if the power is already on, and handle the power state
        if (noble.state === 'poweredOn') {
            onPowerStateChange(noble.state);
        }
    }
    /**
     * Kicks off device discovery
     * @internal
     */
    discoverDevices() {
        if (this.managerDiscoveryState !== device_discovery_state_1.DeviceDiscoveryState.Ready) {
            return;
        }
        // Start discovery
        debug('Beginning device discovery session');
        this.managerDiscoveryState = device_discovery_state_1.DeviceDiscoveryState.Discovering;
        this.activeSessions.forEach(session => { session.startDiscovery(); });
        noble.startScanning();
        this.emit('started');
    }
}
exports.DeviceDiscoveryManager = DeviceDiscoveryManager;
