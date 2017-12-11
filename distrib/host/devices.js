///<reference path="../globals.ts" />
/* ------------
     Devices.ts

     Requires global.ts.

     Routines for the hardware simulation, NOT for our client OS itself.
     These are static because we are never going to instantiate them, because they represent the hardware.
     In this manner, it's A LITTLE BIT like a hypervisor, in that the Document environment inside a browser
     is the "bare metal" (so to speak) for which we write code that hosts our client OS.
     But that analogy only goes so far, and the lines are blurred, because we are using TypeScript/JavaScript
     in both the host and client environments.

     This (and simulation scripts) is the only place that we should see "web" code, like
     DOM manipulation and TypeScript/JavaScript event handling, and so on.  (Index.html is the only place for markup.)

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */
var TSOS;
(function (TSOS) {
    class Devices {
        constructor() {
            _hardwareClockID = -1;
        }
        //
        // Hardware/Host Clock Pulse
        //
        static hostClockPulse() {
            if (_OSclock % 10 == 0) {
                TSOS.Control.hostUpdateDisplayDate();
            }
            // Increment the hardware (host) clock.
            _OSclock++;
            // Call the kernel clock pulse event handler.
            _Kernel.krnOnCPUClockPulse();
        }
        //
        // Keyboard Interrupt, a HARDWARE Interrupt Request. (See pages 560-561 in our text book.)
        //
        static hostEnableKeyboardInterrupt() {
            // Listen for key press (keydown, actually) events in the Document
            // and call the simulation processor, which will in turn call the
            // OS interrupt handler.
            document.addEventListener("keydown", Devices.hostOnKeypress, false);
        }
        static hostDisableKeyboardInterrupt() {
            document.removeEventListener("keydown", Devices.hostOnKeypress, false);
        }
        static hostOnKeypress(event) {
            // The canvas element CAN receive focus if you give it a tab index, which we have.
            // Check that we are processing keystrokes only from the canvas's id (as set in index.html).
            if (event.target.id === "display") {
                event.preventDefault();
                // Note the pressed key code in the params (Mozilla-specific).
                var params = [event.which, event.shiftKey, event.ctrlKey];
                // Enqueue this interrupt on the kernel interrupt queue so that it gets to the Interrupt handler.
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(KEYBOARD_IRQ, params));
            }
        }
        static hostStoreProgramOnDisk(pid, program) {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_WRITE_PROGRAM, pid, program];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
        static hostLoadProgramFromDisk(pid) {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_READ_PROGRAM, pid];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
        static hostDeleteProgramFromDisk(pid) {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_DELETE_PROGRAM, pid];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
        static hostCreateFileOnDisk(filename) {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_CREATE_FILE, filename];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
        static hostReadFileFromDisk(filename) {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_READ_FILE, filename];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
        static hostWriteFileToDisk(filename, file) {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_WRITE_FILE, filename, file];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
        static hostDeleteFileFromDisk(filename) {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_DELETE_FILE, filename];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
        static hostFormatDisk(type) {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_FORMAT, type];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
        static hostListFilesOnDisk(type) {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_LS, type];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
        static hostCheckDisk() {
            var params = [TSOS.DeviceDriverDisk.DEVICE_DRIVER_DISK_CHECK_DISK];
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(DISK_IRQ, params));
        }
    }
    TSOS.Devices = Devices;
})(TSOS || (TSOS = {}));
