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

            // The code below cannot run because "this" can only be
            // accessed after calling super.
            //super(this.krnKbdDriverEntry, this.krnKbdDispatchKeyPress);
            super();
            this.driverEntry = this.krnKbdDriverEntry;
            this.isr = this.krnKbdDispatchKeyPress;
        }

        public krnKbdDriverEntry() {
            // Initialization routine for this, the kernel-mode Keyboard Device Driver.
            this.status = "loaded";
            // More?
        }

        public krnKbdDispatchKeyPress(params) {
            // Parse the params.    TODO: Check that the params are valid and osTrapError if not.
            var keyCode = params[0];
            var isShifted = params[1];
            _Kernel.krnTrace("Key code:" + keyCode + " shifted:" + isShifted);
            var chr = "";
            // Check to see if we even want to deal with the key that was pressed.
            if ((keyCode >= 65) && (keyCode <= 90)) {  // letter
                chr = (isShifted || this.isCapsLock) && !(isShifted && this.isCapsLock) ? // What language doesn't have XOR?!?
                    String.fromCharCode(keyCode) : // Uppercase A-Z
                    String.fromCharCode(keyCode + 32); // Lowercase a-z
            } else if ((keyCode == 32)      ||   // space
                        (keyCode == 13)     ||   // enter
				        (keyCode == 8)) {        // backspace
                chr = String.fromCharCode(keyCode);
            } else if (keyCode in this.keyCodeMap || keyCode in this.shiftedKeyCodeMap) {
                chr = this.mapKeyPress(keyCode, isShifted);
            } else if (keyCode == 20) { // caps lock pressed
                this.isCapsLock = !this.isCapsLock;
            }
            _KernelInputQueue.enqueue(chr);
        }

        public keyCodeMap = {
            96 : 48, // 0
            97 : 49, // 1
            98 : 50, // 2
            99 : 51, // 3
            100: 52, // 4
            101: 53, // 5
            102: 54, // 6
            103: 55, // 7
            104: 56, // 8
            105: 57, // 9
            106: 42, // *
            107: 43, // +
            109: 45, // -
            110: 46, // .
            111: 47, // /
            186: 59, // ;
            187: 61, // =
            188: 44, // ,
            189: 45, // -
            190: 46, // .
            191: 47, // /
            192: 96, // `
            219: 91, // [
            220: 92, // \
            221: 93, // ]
            222: 39  // '
        };

        public shiftedKeyCodeMap = {
            48 : 41, // )
            49 : 33, // !
            50 : 64, // @
            51 : 35, // #
            52 : 36, // $
            53 : 37, // %
            54 : 94, // ^
            55 : 38, // &
            56 : 42, // *
            57 : 40, // (
            186: 58, // :
            187: 43, // +
            188: 60, // <
            189: 95, // _
            190: 62, // >
            191: 63, // ?
            192: 126,// ~
            219: 123,// {
            220: 124,// |
            221: 125,// }
            222: 34  // "
        };

        public mapKeyPress(keyCode, isShifted): string {
             if (!isShifted) { // punctuation characters and symbols
                 return ((keyCode in this.keyCodeMap) ?
                     String.fromCharCode(this.keyCodeMap[keyCode]) :
                     String.fromCharCode(keyCode));
                } else { // shifted punctuation characters and symbols
                    return String.fromCharCode(this.shiftedKeyCodeMap[keyCode]);
                }
        }
    }

}
