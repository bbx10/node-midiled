/* jslint node: true */
'use strict';

/*
The MIT License (MIT)

Copyright (c) 2015 bbx10node@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

var ws281x = require('rpi-ws281x-native');

var NUM_LEDS = parseInt(process.argv[2], 10) || 8;
var PixelData = new Uint32Array(NUM_LEDS);

var MIDI_DEBUG = false;
var GAMMA_CORRECT = false;

ws281x.init(NUM_LEDS);

process.on('SIGINT', function () {
  ws281x.reset();
  midi_input.closePort();
  process.nextTick(function () { process.exit(0); });
});

console.log('Press <ctrl>+C to exit.');

// gamma = 2.2
var Gamma22=[0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,11,12,12,13,13,14,14,14,15,15,16,16,17,17,18,18,19,19,20,20,21,22,22,23,23,24,24,25,26,26,27,28,28,29,30,30,31,32,32,33,34,34,35,36,37,37,38,39,40,41,41,42,43,44,45,46,46,47,48,49,50,51,52,53,54,55,56,56,57,58,59,60,61,62,63,64,66,67,68,69,70,71,72,73,74,75,76,78,79,80,81,82,83,85,86,87,88,89,91,92,93,94,96,97,98,100,101,102,104,105,106,108,109,110,112,113,115,116,118,119,120,122,123,125,126,128,129,131,132,134,136,137,139,140,142,143,145,147,148,150,152,153,155,157,158,160,162,163,165,167,169,170,172,174,176,177,179,181,183,185,187,188,190,192,194,196,198,200,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,236,238,240,242,245,247,249,251,253,256];

// Fill all dots with the rgb_color
function colorFill(rgb_color) {
  var i;
  for (i = 0 ; i < NUM_LEDS; i++ ) {
    PixelData[i] = rgb_color;
  }
  ws281x.render(PixelData);
}

function rgb2int(r, g, b) {
  if (GAMMA_CORRECT) {
    return (Gamma22[r & 0xff] << 16) | (Gamma22[g & 0xff] << 8) | (Gamma22[b & 0xff]);
  }
  else {
    return ((r & 0xff) << 16) | ((g & 0xff) << 8) | ((b & 0xff));
  }
}

var midi = require('midi');
var spawn = require('child_process').spawn;
var aconnect;

var MIDI_CMD_NOTE_ON    = 0;
var MIDI_CMD_NOTE_OFF   = 1;
var MIDI_CMD_AFTERTOUCH = 2;
var MIDI_CMD_CONTINUOUS = 3;
var MIDI_CMD_PATCH_CHG  = 4;
var MIDI_CMD_CHANNEL_PR = 5;
var MIDI_CMD_PITCH_BEND = 6;
var MIDI_CMD_SYSTEM     = 7;


// Set up a new input.
var midi_input = new midi.input();
var LEDColor = [0, 0, 0];
colorFill(0);

// Array of functions indexed by MIDI_CMD_* to handle MIDI commands
var Commands = [
  note_off_func,
  note_on_func,
  aftertouch_func,
  continuous_func,
  patch_chg_func,
  channel_pr_func,
  pitch_bend_func,
  system_func
];

var CC_TYPE_BREATH                = 2;
var CC_TYPE_VOLUME                = 7;
var CC_TYPE_ALL_SOUNDS_OFF        = 120;
var CC_TYPE_RESET_ALL_CONTROLLERS = 121;
var CC_TYPE_LOCAL_CONTROL         = 122;  // value=0 off, value=127 on
var CC_TYPE_ALL_NOTES_OFF         = 123;
var CC_TYPE_OMNI_MODE_OFF         = 124;
var CC_TYPE_OMNI_MODE_ON          = 125;
var CC_TYPE_MONO_MODE_OFF         = 126;
var CC_TYPE_MONO_MODE_ON          = 127;

/*
 * 4 x 4 Drum pad
 * |=====================================
 * |  Red | Green  |  Blue  | Gamma On  |
 * |  Cyan| Yellow | Magenta| Gamma Off |
 * |  n/a | n/a    |  n/a   | n/a       |
 * |  n/a | n/a    |  n/a   | n/a       |
 * |=====================================
 */

function note_on_func(channel, note, velocity) {
  if (MIDI_DEBUG) {
    console.log('Note on chann', channel, 'note', note, 'velocity', velocity);
  }
  switch (note) {
    case 48:  // TouchDAW top left corner (0,0) drum pad in 4x4 array
      LEDColor[0] = velocity*2;
    break;
    case 49:  // TouchDAW (0,1) drum pad in 4x4 array
      LEDColor[1] = velocity*2;
    break;
    case 50:  // TouchDAW (0,2) drum pad in 4x4 array
      LEDColor[2] = velocity*2;
    break;
    case 51:  // TouchDAW (0,3) drum pad in 4x4 array
      console.log('Gamma correction on');
      GAMMA_CORRECT = true;
    break;
    case 44:  // TouchDAW (1,0) drum pad in 4x4 array
      LEDColor[1] = LEDColor[2] = velocity*2;
    break;
    case 45:  // TouchDAW (1,1) drum pad in 4x4 array
      LEDColor[0] = LEDColor[1] = velocity*2;
    break;
    case 46:  // TouchDAW (1,2) drum pad in 4x4 array
      LEDColor[0] = LEDColor[2] = velocity*2;
    break;
    case 47:  // TouchDAW (1,3) drum pad in 4x4 array
      console.log('Gamma correction off');
      GAMMA_CORRECT = false;
    break;
  }
  colorFill(rgb2int(LEDColor[0], LEDColor[1], LEDColor[2]));
}

function note_off_func(channel, note, velocity) {
  if (MIDI_DEBUG) {
    console.log('Note off chann', channel, 'note', note, 'velocity', velocity);
  }
  switch (note) {
    case 48:  // TouchDAW (0,0) drum pad in 4x4 array
      LEDColor[0] = 0;
    break;
    case 49:  // TouchDAW (0,1) drum pad in 4x4 array
      LEDColor[1] = 0;
    break;
    case 50:  // TouchDAW (0,2) drum pad in 4x4 array
      LEDColor[2] = 0;
    break;
    case 44:  // TouchDAW (1,0) drum pad in 4x4 array
      LEDColor[1] = LEDColor[2] = 0;
    break;
    case 45:  // TouchDAW (1,1) drum pad in 4x4 array
      LEDColor[0] = LEDColor[1] = 0;
    break;
    case 46:  // TouchDAW (1,2) drum pad in 4x4 array
      LEDColor[0] = LEDColor[2] = 0;
    break;
  }
  colorFill(rgb2int(LEDColor[0], LEDColor[1], LEDColor[2]));
}

function aftertouch_func(channel, note, aftertouch) {
  if (MIDI_DEBUG) {
    console.log('Aftertouch chann', channel, 'note', note, 'aftertouch',
      aftertouch);
  }
}

function continuous_func(channel, controller_type, controller_value) {
  if (MIDI_DEBUG) {
    console.log('continuous control', channel, 'type', controller_type,
                'value', controller_value);
  }
  switch (controller_type) {
    case CC_TYPE_VOLUME:
    case CC_TYPE_BREATH:
      switch (channel) {
        case 0: // channel 0 Red
        case 1: // channel 1 Green
        case 2: // channel 2 Blue
          LEDColor[channel] = controller_value*2;
          break;
        default:
          break;
      }
      colorFill(rgb2int(LEDColor[0], LEDColor[1], LEDColor[2]));
      break;
    case CC_TYPE_ALL_SOUNDS_OFF:
      if (MIDI_DEBUG) {
        console.log('All sounds off', controller_value);
      }
      LEDColor[0] = LEDColor[1] = LEDColor[2] = 0;
      colorFill(0, 0, 0);
      break;
    case CC_TYPE_RESET_ALL_CONTROLLERS:
      if (MIDI_DEBUG) {
        console.log('Reset all controllers', controller_value);
      }
      LEDColor[0] = LEDColor[1] = LEDColor[2] = 0;
      colorFill(0, 0, 0);
      break;
    case CC_TYPE_ALL_NOTES_OFF:
      if (MIDI_DEBUG) {
        console.log('All notes off', controller_value);
      }
      LEDColor[0] = LEDColor[1] = LEDColor[2] = 0;
      colorFill(0, 0, 0);
      break;
    case CC_TYPE_LOCAL_CONTROL:
      break;
    case CC_TYPE_OMNI_MODE_OFF:
      break;
    case CC_TYPE_OMNI_MODE_ON:
      break;
    case CC_TYPE_MONO_MODE_OFF:
      break;
    case CC_TYPE_MONO_MODE_ON:
      break;
    default:
      break;
  }
}

function patch_chg_func(channel, instrument) {
  if (MIDI_DEBUG) {
    console.log('patch change chann', channel, 'instrument', instrument);
  }
}

function channel_pr_func(channel, pressure) {
  if (MIDI_DEBUG) {
    console.log('channel pressure chann', channel, 'pressure', pressure);
  }
}

function pitch_bend_func(channel, lsb7, msb7) {
  // lsb7 = least significant 7 bits, msb7=most siginificant 7 bits
  var bend = ((msb7 & 0x7F) << 7 ) | (lsb7 & 0x7F);
  if (MIDI_DEBUG) {
    console.log('pitch bend chann', channel, 'bend', bend);
  }
}

function system_func(channel, unknown1, unknown2) {
  if (MIDI_DEBUG) {
    console.log('reserved chann', channel, unknown1, unknown2);
    switch (channel) {
      case  2:
        console.log('Song position pointer');
        break;
      case 12:
        console.log('Stop the current sequence');
        break;
      default:
        break;
    }
  }
}

// Configure a callback.
midi_input.on('message', function(deltaTime, message) {
  var command, channel, note, velocity, controller_type, controller_value;
  //console.log('m:' + message + ' d:' + deltaTime);
  command = (message[0] & 0x70) >> 4;
  channel = (message[0] & 0x0F);
  Commands[command](channel, message[1], message[2]);
});

// Create a virtual MIDI input port for the LEDs
midi_input.openVirtualPort('LEDs');
// aconnect connects MIDI multicast port 2 (multimidicast) to
// the virtual MIDI port created by this program. The numbers may
// be different on your system.
aconnect = spawn('/usr/bin/aconnect', ['multimidicast:2','RtMidi Input Client:0']);
