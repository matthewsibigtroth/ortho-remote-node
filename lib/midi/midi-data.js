"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const midi_message_1 = require("./midi-message");
/**
 * Parses MIDI a data packet and returns one or more piece of MidiData
 * @internal
 *
 * @param packetData - BLE-MIDI packet to parese
 *
 * @return parsed data
 */
function parseMidiDataPacket(packetData) {
    const midiData = [];
    if (!packetData || packetData.length < 5) {
        return midiData;
    }
    // First byte is the timestampHigh
    const timestampHigh = packetData[0];
    if (!(timestampHigh && 0x80)) {
        return midiData;
    }
    // Second byte is the timestampLow
    const timestampLow = packetData[1];
    if (!(timestampLow && 0x80)) {
        return midiData;
    }
    const timestamp = (timestampLow & 0x7F) | ((timestampHigh & 0x3F) << 7);
    // Third is status
    const status = packetData[2];
    if (!(status && 0x80)) {
        return midiData;
    }
    // Covert the status into a message
    // See http://www.indiana.edu/~emusic/etext/MIDI/chapter3_MIDI4.shtml
    const message = (status & midi_message_1.MidiMessageBitMask);
    const channel = (status & ~midi_message_1.MidiMessageBitMask);
    const data = packetData.slice(3, 5);
    // NOTE: Midi packets can be longer, but for Ortho they are only even 5 bytes
    return [{
            timestamp,
            message,
            channel,
            data,
        }];
}
exports.parseMidiDataPacket = parseMidiDataPacket;
/**
 * Encodes `MidiData` into raw a MIDI data `Buffer` to write to a peripheral
 * @internal
 *
 * @param midiData - data to encode
 * @return `Buffer` encoded MIDI data
 */
function toMidiDataPacket(midiData) {
    const buffer = Buffer.alloc(5, 0);
    // Timestamp
    const timestamp = midiData.timestamp % 8192;
    const tsLow = timestamp & 0x7F;
    const tsHigh = (timestamp >> 7) & 0x3F;
    buffer[0] = tsHigh | 0x80;
    buffer[1] = tsLow | 0x80;
    // Status
    buffer[2] = midiData.message | (midiData.channel & 0xF);
    // Data
    buffer[3] = midiData.data[0] & 0x7F;
    buffer[4] = midiData.data[1] & 0x7F;
    return buffer;
}
exports.toMidiDataPacket = toMidiDataPacket;
