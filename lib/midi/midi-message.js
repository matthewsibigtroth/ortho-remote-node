"use strict";
/* tslint:disable:completed-docs */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * MIDI message type
 */
var MidiMessage;
(function (MidiMessage) {
    MidiMessage[MidiMessage["NoteOff"] = 128] = "NoteOff";
    MidiMessage[MidiMessage["NoteOn"] = 144] = "NoteOn";
    MidiMessage[MidiMessage["PolyKeyPressure"] = 160] = "PolyKeyPressure";
    MidiMessage[MidiMessage["ControlChange"] = 176] = "ControlChange";
    MidiMessage[MidiMessage["ProgramChange"] = 192] = "ProgramChange";
    MidiMessage[MidiMessage["ChannelPressure"] = 208] = "ChannelPressure";
    MidiMessage[MidiMessage["PitchBand"] = 224] = "PitchBand";
    MidiMessage[MidiMessage["SysEx"] = 240] = "SysEx";
})(MidiMessage = exports.MidiMessage || (exports.MidiMessage = {}));
exports.MidiMessageBitMask = 0b1111 << 4;
