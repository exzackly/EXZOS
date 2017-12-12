///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />
/* ----------------------------------
   DeviceDriverKeyboard.ts

   Requires deviceDriver.ts

   The Kernel Keyboard Device Driver.
   ---------------------------------- */
var TSOS;
(function (TSOS) {
    // Extends DeviceDriver
    class DeviceDriverKeyboard extends TSOS.DeviceDriver {
        constructor() {
            // Override the base method pointers.
            super();
            this.isCapsLock = false; // Assume caps lock starts in off position; can we detect actual condition?
            this.newKeyCodeMap = {
                // key: [normal, shifted]
                48: [48, 41],
                49: [49, 33],
                50: [50, 64],
                51: [51, 35],
                52: [52, 36],
                53: [53, 37],
                54: [54, 94],
                55: [55, 38],
                56: [56, 42],
                57: [57, 40],
                96: [48, 48],
                97: [49, 49],
                98: [50, 50],
                99: [51, 51],
                100: [52, 52],
                101: [53, 53],
                102: [54, 54],
                103: [55, 55],
                104: [56, 56],
                105: [57, 57],
                106: [42, 42],
                107: [43, 43],
                109: [45, 45],
                110: [46, 46],
                111: [47, 47],
                186: [59, 58],
                187: [61, 43],
                188: [44, 60],
                189: [45, 95],
                190: [46, 62],
                191: [47, 63],
                192: [96, 126],
                219: [91, 123],
                220: [92, 124],
                221: [93, 125],
                222: [39, 34] // ' "
            };
            this.driverEntry = this.krnKbdDriverEntry;
            this.isr = this.krnKbdDispatchKeyPress;
        }
        krnKbdDriverEntry() {
            // Initialization routine for this, the kernel-mode Keyboard Device Driver.
            this.status = "loaded";
        }
        krnKbdDispatchKeyPress(params) {
            // Parse the params.
            var keyCode = params[0];
            var isShifted = params[1];
            var isCtrled = params[2];
            _Kernel.krnTrace("Key code:" + keyCode + " shifted:" + isShifted);
            var chr = "";
            // Check to see if we even want to deal with the key that was pressed.
            if (isCtrled === true && keyCode == 82) {
                chr = "&ctrl-r";
            }
            else if ((keyCode >= 65) && (keyCode <= 90)) {
                chr = (isShifted || this.isCapsLock) && !(isShifted && this.isCapsLock) ?
                    String.fromCharCode(keyCode) :
                    String.fromCharCode(keyCode + 32); // Lowercase a-z
            }
            else if ((keyCode == 32) ||
                (keyCode == 13) ||
                (keyCode == 8)) {
                chr = String.fromCharCode(keyCode);
            }
            else if (keyCode in this.newKeyCodeMap) {
                chr = this.mapKeyPress(keyCode, isShifted);
            }
            else if (keyCode == 38) {
                chr = "&uarr;";
            }
            else if (keyCode == 40) {
                chr = "&darr;";
            }
            else if (keyCode == 9) {
                chr = "&tab;";
            }
            else if (keyCode == 20) {
                this.isCapsLock = !this.isCapsLock;
            }
            _KernelInputQueue.enqueue(chr);
        }
        mapKeyPress(keyCode, isShifted) {
            if (isShifted === false) {
                return String.fromCharCode(this.newKeyCodeMap[keyCode][0]);
            }
            else {
                return String.fromCharCode(this.newKeyCodeMap[keyCode][1]);
            }
        }
    }
    TSOS.DeviceDriverKeyboard = DeviceDriverKeyboard;
})(TSOS || (TSOS = {}));
