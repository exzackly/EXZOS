///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/* ----------------------------------
   DeviceDriverKeyboard.ts

   Requires deviceDriver.ts

   The Kernel Keyboard Device Driver.
   ---------------------------------- */
var TSOS;
(function (TSOS) {
    // Extends DeviceDriver
    var DeviceDriverKeyboard = (function (_super) {
        __extends(DeviceDriverKeyboard, _super);
        function DeviceDriverKeyboard() {
            // Override the base method pointers.
            var _this = 
            // The code below cannot run because "this" can only be
            // accessed after calling super.
            //super(this.krnKbdDriverEntry, this.krnKbdDispatchKeyPress);
            _super.call(this) || this;
            _this.isCapsLock = false; // Assume caps lock starts in off position; can we detect actual condition?
            _this.keyCodeMap = {
                96: 48,
                97: 49,
                98: 50,
                99: 51,
                100: 52,
                101: 53,
                102: 54,
                103: 55,
                104: 56,
                105: 57,
                106: 42,
                107: 43,
                109: 45,
                110: 46,
                111: 47,
                186: 59,
                187: 61,
                188: 44,
                189: 45,
                190: 46,
                191: 47,
                192: 96,
                219: 91,
                220: 92,
                221: 93,
                222: 39 // '
            };
            _this.shiftedKeyCodeMap = {
                48: 41,
                49: 33,
                50: 64,
                51: 35,
                52: 36,
                53: 37,
                54: 94,
                55: 38,
                56: 42,
                57: 40,
                186: 58,
                187: 43,
                188: 60,
                189: 95,
                190: 62,
                191: 63,
                192: 126,
                219: 123,
                220: 124,
                221: 125,
                222: 34 // "
            };
            _this.driverEntry = _this.krnKbdDriverEntry;
            _this.isr = _this.krnKbdDispatchKeyPress;
            return _this;
        }
        DeviceDriverKeyboard.prototype.krnKbdDriverEntry = function () {
            // Initialization routine for this, the kernel-mode Keyboard Device Driver.
            this.status = "loaded";
            // More?
        };
        DeviceDriverKeyboard.prototype.krnKbdDispatchKeyPress = function (params) {
            // Parse the params.    TODO: Check that the params are valid and osTrapError if not.
            var keyCode = params[0];
            var isShifted = params[1];
            _Kernel.krnTrace("Key code:" + keyCode + " shifted:" + isShifted);
            var chr = "";
            // Check to see if we even want to deal with the key that was pressed.
            if ((keyCode >= 65) && (keyCode <= 90)) {
                chr = (isShifted || this.isCapsLock) && !(isShifted && this.isCapsLock) ?
                    String.fromCharCode(keyCode) :
                    String.fromCharCode(keyCode + 32); // Lowercase a-z
            }
            else if ((keyCode == 32) ||
                (keyCode == 13) ||
                (keyCode == 8)) {
                chr = String.fromCharCode(keyCode);
            }
            else if (keyCode in this.keyCodeMap || keyCode in this.shiftedKeyCodeMap) {
                chr = this.mapKeyPress(keyCode, isShifted);
            }
            else if (keyCode == 20) {
                this.isCapsLock = !this.isCapsLock;
            }
            _KernelInputQueue.enqueue(chr);
        };
        DeviceDriverKeyboard.prototype.mapKeyPress = function (keyCode, isShifted) {
            if (!isShifted) {
                return ((keyCode in this.keyCodeMap) ?
                    String.fromCharCode(this.keyCodeMap[keyCode]) :
                    String.fromCharCode(keyCode));
            }
            else {
                return String.fromCharCode(this.shiftedKeyCodeMap[keyCode]);
            }
        };
        return DeviceDriverKeyboard;
    }(TSOS.DeviceDriver));
    TSOS.DeviceDriverKeyboard = DeviceDriverKeyboard;
})(TSOS || (TSOS = {}));
