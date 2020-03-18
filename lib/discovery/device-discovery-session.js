"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const createDebugLogger = require("debug");
const events_1 = require("events");
const timers_1 = require("timers");
const device_discovery_state_1 = require("./device-discovery-state");
// Create debug logger
const debug = createDebugLogger('orthoRemote/discovery');
/**
 * A single discovery session, keeping the vending manager monitor for Ortho Remote devices
 *
 * Do not create a session manually, instead use DeviceDiscoveryManager to start discovery
 */
class DeviceDiscoverySession extends events_1.EventEmitter {
    /**
     * @internal
     * @param manager - vending discovery manager
     * @param [options] - session options
     */
    constructor(manager, options) {
        super();
        /**
         * Internal map of discovered devices, and devices to ignore when seen subsequent times
         * @internal
         */
        this.sessionDiscoveredDevicesMap = new Map();
        this.deviceManager = manager;
        this.discoveryOptions = Object.assign({}, options);
        // Replicate the discovery state
        this.sessionDiscoveryState = manager.discoveryState;
        // Initialize a timeout
        const timeout = this.discoveryOptions.timeoutMs;
        if (timeout && timeout > 0) {
            if (options instanceof Object) {
                this.timeoutTimer = timers_1.setTimeout(this.onSessionTimeout.bind(this), timeout);
            }
        }
    }
    //
    // Public properties
    //
    /**
     * Discovery state for the session
     */
    get discoveryState() {
        const managerState = this.deviceManager.discoveryState;
        if (managerState === device_discovery_state_1.DeviceDiscoveryState.Discovering) {
            return this.sessionDiscoveryState;
        }
        return managerState;
    }
    /**
     * All discovered devices by the device manager
     */
    get discoveredDevices() {
        return [...this.sessionDiscoveredDevicesMap.values()];
    }
    //
    // Public functions
    //
    /**
     * Stop device discover for this session
     */
    stop() {
        this.stopDiscovery(false);
    }
    /**
     * Waits for a single (first) device or until time out, if specified when creating the session
     *
     * @param [autoStop=true] - causes the session to be stopped when a device is returned
     *
     * @throw `NuimoDeviceError` when timing out
     */
    waitForFirstDevice(autoStop = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.waitForDevicePromise) {
                return this.waitForDevicePromise;
            }
            // Check if there is already a device, if so return it immediately
            if (this.sessionDiscoveredDevicesMap.size > 0) {
                const iterator = this.sessionDiscoveredDevicesMap.values().next();
                if (iterator.value) {
                    this.waitForDevicePromise = Promise.resolve(iterator.value);
                    return this.waitForDevicePromise;
                }
            }
            // Need to wait for a device to be discovered
            const self = this;
            const lisenters = new Map();
            /** Function called when a device is discovered */
            function onWaitDeviceDiscovered(device) {
                if (self.waitForDeviceResolveCallback) {
                    self.waitForDeviceResolveCallback(device);
                    // stop discovery if we should auto-stop
                    if (autoStop) {
                        self.stopDiscovery(false);
                    }
                }
                self.waitForDeviceResolveCallback = undefined;
                self.waitForDeviceRejectCallback = undefined;
                lisenters.forEach((value, key) => {
                    self.removeListener(key, value);
                });
            }
            /** Function called when the session times */
            function onWaitTimeout() {
                if (self.waitForDeviceRejectCallback) {
                    self.waitForDeviceRejectCallback(new Error('Timeout'));
                }
                self.waitForDeviceResolveCallback = undefined;
                self.waitForDeviceRejectCallback = undefined;
                lisenters.forEach((value, key) => {
                    self.removeListener(key, value);
                });
            }
            // Listen for device/timeout events
            this.once('device', onWaitDeviceDiscovered);
            lisenters.set('device', onWaitDeviceDiscovered);
            this.once('timeout', onWaitTimeout);
            lisenters.set('timeout', onWaitTimeout);
            this.waitForDevicePromise = new Promise((resolve, reject) => {
                self.waitForDeviceResolveCallback = resolve;
                self.waitForDeviceRejectCallback = reject;
            });
            return this.waitForDevicePromise;
        });
    }
    /**
     * Called by DeviceDiscoveryManager, not intented to be called directly
     * @internal
     */
    startDiscovery() {
        if (this.deviceManager.discoveryState !== device_discovery_state_1.DeviceDiscoveryState.Discovering) {
            return;
        }
        this.sessionDiscoveryState = device_discovery_state_1.DeviceDiscoveryState.Discovering;
    }
    /**
     * Stops discovery for this session
     * @internal
     *
     * @param timeout - `true` if stopping is because of a timeout
     */
    stopDiscovery(timeout) {
        if (this.discoveryState !== device_discovery_state_1.DeviceDiscoveryState.Ready) {
            this.sessionDiscoveryState = device_discovery_state_1.DeviceDiscoveryState.Ready;
            this.deviceManager.stopDiscoverySession(this);
            if (this.timeoutTimer) {
                clearTimeout(this.timeoutTimer);
                this.timeoutTimer = undefined;
            }
            // Emit timeout event
            this.emit('done', timeout);
        }
    }
    /**
     * Called from the vending manager when a device has been discovered
     * @internal
     *
     * @param device - Ortho Remote device
     * @param newDevice - true if the device has never been seen before
     */
    onDeviceDiscovered(device, newDevice) {
        // Can happen between async calls, a stop is issued whilst we are async processing handling of
        // discovered devices
        if (this.discoveryState !== device_discovery_state_1.DeviceDiscoveryState.Discovering) {
            return;
        }
        // If the device has already been seen, ignore it
        if (this.sessionDiscoveredDevicesMap.has(device.id)) {
            return;
        }
        this.sessionDiscoveredDevicesMap.set(device.id, device);
        const whitelisted = this.discoveryOptions.deviceIds;
        if (!whitelisted || whitelisted.includes(device.id)) {
            this.emit('device', device, newDevice);
        }
    }
    //
    // Private functions
    //
    /**
     * Called when the session times out
     * @internal
     */
    onSessionTimeout() {
        debug('Discovery session timed out');
        this.emit('timeout');
        this.timeoutTimer = undefined;
        this.stopDiscovery(true);
        this.deviceManager.stopDiscoverySession(this);
    }
}
exports.DeviceDiscoverySession = DeviceDiscoverySession;
