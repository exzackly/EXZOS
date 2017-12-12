///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />

/* ----------------------------------
   DeviceDriverKeyboard.ts

   Requires deviceDriver.ts

   The Kernel Keyboard Device Driver.
   ---------------------------------- */

module TSOS {

    // Extends DeviceDriver
    export class DeviceDriverKeyboard extends DeviceDriver {

        public isCapsLock = false; // Assume caps lock starts in off position; can we detect actual condition?

        constructor() {
            // Override the base method pointers.

            super();
            this.driverEntry = this.krnKbdDriverEntry;
            this.isr = this.krnKbdDispatchKeyPress;
        }

        public krnKbdDriverEntry() {
            // Initialization routine for this, the kernel-mode Keyboard Device Driver.
            this.status = "loaded";
        }

        public krnKbdDispatchKeyPress(params) {
            // Parse the params.
            var keyCode = params[0];
            var isShifted = params[1];
            var isCtrled = params[2];
            _Kernel.krnTrace("Key code:" + keyCode + " shifted:" + isShifted);
            var chr = "";
            // Check to see if we even want to deal with the key that was pressed.
            if (isCtrled === true && keyCode == 82) { // control-r
                chr = "&ctrl-r";
            } else if ((keyCode >= 65) && (keyCode <= 90)) {  // letter
                chr = (isShifted || this.isCapsLock) && !(isShifted && this.isCapsLock) ? // What language doesn't have XOR?!?
                    String.fromCharCode(keyCode) : // Uppercase A-Z
                    String.fromCharCode(keyCode + 32); // Lowercase a-z
            } else if ((keyCode == 32) || // space
                (keyCode == 13) ||        // enter
                (keyCode == 8)) {         // backspace
                chr = String.fromCharCode(keyCode);
            } else if (keyCode in this.newKeyCodeMap) {
                chr = this.mapKeyPress(keyCode, isShifted);
            } else if (keyCode == 38) { // up arrow
                chr = "&uarr;";
            } else if (keyCode == 40) { // down arrow
                chr = "&darr;";
            } else if (keyCode == 9) {  // tab
                chr = "&tab;";
            } else if (keyCode == 20) { // caps lock pressed
                this.isCapsLock = !this.isCapsLock;
            }
            _KernelInputQueue.enqueue(chr);
        }

        public newKeyCodeMap = {
            // key: [normal, shifted]
            48: [48, 41],   // 0 )
            49: [49, 33],   // 1 !
            50: [50, 64],   // 2 @
            51: [51, 35],   // 3 #
            52: [52, 36],   // 4 $
            53: [53, 37],   // 5 %
            54: [54, 94],   // 6 ^
            55: [55, 38],   // 7 &
            56: [56, 42],   // 8 *
            57: [57, 40],   // 9 (
            96: [48, 48],   // 0 0
            97: [49, 49],   // 1 1
            98: [50, 50],   // 2 2
            99: [51, 51],   // 3 3
            100: [52, 52],  // 4 4
            101: [53, 53],  // 5 5
            102: [54, 54],  // 6 6
            103: [55, 55],  // 7 7
            104: [56, 56],  // 8 8
            105: [57, 57],  // 9 9
            106: [42, 42],  // * *
            107: [43, 43],  // + +
            109: [45, 45],  // - -
            110: [46, 46],  // . .
            111: [47, 47],  // / /
            186: [59, 58],  // ; :
            187: [61, 43],  // = +
            188: [44, 60],  // , <
            189: [45, 95],  // - _
            190: [46, 62],  // . >
            191: [47, 63],  // / ?
            192: [96, 126], // ` ~
            219: [91, 123], // [ {
            220: [92, 124], // \ |
            221: [93, 125], // ] }
            222: [39, 34]   // ' "
        };

        public mapKeyPress(keyCode, isShifted): string {
            if (isShifted === false) { // punctuation characters and symbols
                return String.fromCharCode(this.newKeyCodeMap[keyCode][0]);
            } else { // shifted punctuation characters and symbols
                return String.fromCharCode(this.newKeyCodeMap[keyCode][1]);
            }
        }

    }

}
