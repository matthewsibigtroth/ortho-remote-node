"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Services available on Ortho Remote peripherals
 * @internal
 */
var PeripheralService;
(function (PeripheralService) {
    PeripheralService["BatteryStatus"] = "180f";
    PeripheralService["BleMidi"] = "03b80e5aede84b33a7516ce34ec4c700";
})(PeripheralService = exports.PeripheralService || (exports.PeripheralService = {}));
/**
 * Battery status service characteristics
 * @internal
 */
var BatteryStatusServiceCharacteristic;
(function (BatteryStatusServiceCharacteristic) {
    BatteryStatusServiceCharacteristic["BatteryLevel"] = "2a19";
})(BatteryStatusServiceCharacteristic = exports.BatteryStatusServiceCharacteristic || (exports.BatteryStatusServiceCharacteristic = {}));
/**
 * BLE-MIDI service characteristics
 * @internal
 */
var BleMidiServiceCharacteristic;
(function (BleMidiServiceCharacteristic) {
    BleMidiServiceCharacteristic["MidiDataIO"] = "7772e5db38684112a1a9f2669d106bf3";
})(BleMidiServiceCharacteristic = exports.BleMidiServiceCharacteristic || (exports.BleMidiServiceCharacteristic = {}));
