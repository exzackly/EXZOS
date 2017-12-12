///<reference path="../globals.ts" />
///<reference path="queue.ts" />
/* ------------
     Kernel.ts

     Requires globals.ts
              queue.ts

     Routines for the Operating System, NOT the host.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */
var TSOS;
(function (TSOS) {
    class Kernel {
        //
        // OS Startup and Shutdown Routines
        //
        krnBootstrap() {
            TSOS.Control.hostLog("bootstrap", "host"); // Use hostLog because we ALWAYS want this, even if _Trace is off.
            // Initialize our global queues.
            _KernelInterruptQueue = new TSOS.Queue(); // A (currently) non-priority queue for interrupt requests (IRQs).
            _KernelBuffers = new Array(); // Buffers... for the kernel.
            _KernelInputQueue = new TSOS.Queue(); // Where device input lands before being processed out somewhere.
            // Initialize the console.
            _Console = new TSOS.Console(); // The command line interface / console I/O device.
            // Initialize standard input and output to the _Console.
            _StdIn = _Console;
            _StdOut = _Console;
            // Load the Keyboard Device Driver
            this.krnTrace("Loading the keyboard device driver");
            _krnKeyboardDriver = new TSOS.DeviceDriverKeyboard(); // Construct it.
            _krnKeyboardDriver.driverEntry(); // Call the driverEntry() initialization routine.
            this.krnTrace(`Keyboard device driver ${_krnKeyboardDriver.status}`);
            // Load the Disk Device Driver
            this.krnTrace("Loading the disk device driver");
            _krnDiskDriver = new TSOS.DeviceDriverDisk(); // Construct it.
            _krnDiskDriver.driverEntry(); // Call the driverEntry() initialization routine.
            this.krnTrace(`Disk device driver ${_krnDiskDriver.status}`);
            // Enable the OS Interrupts.  (Not the CPU clock interrupt, as that is done in the hardware sim.)
            this.krnTrace("Enabling the interrupts");
            this.krnEnableInterrupts();
            // Launch the shell.
            this.krnTrace("Creating and Launching the shell");
            _OsShell = new TSOS.Shell();
            // Finally, initiate student testing protocol.
            if (_GLaDOS) {
                _GLaDOS.afterStartup();
            }
        }
        krnShutdown() {
            this.krnTrace("Begin shutdown OS");
            // Terminate all running processes
            var processes = _Scheduler.residentList;
            for (var i = 0; i < processes.length; i++) {
                _Scheduler.terminateProcess(processes[i].pid);
            }
            // ... Disable the Interrupts.
            this.krnTrace("Disabling the interrupts");
            this.krnDisableInterrupts();
            this.krnTrace("End shutdown OS");
        }
        krnOnCPUClockPulse() {
            /* This gets called from the host hardware simulation every time there is a hardware clock pulse.
               This is NOT the same as a TIMER, which causes an interrupt and is handled like other interrupts.
               This, on the other hand, is the clock pulse from the hardware / VM / host that tells the kernel
               that it has to look for interrupts and process them if it finds any.                           */
            // Check for an interrupt, are any. Page 560
            if (_KernelInterruptQueue.getSize() > 0) {
                // Process the first interrupt on the interrupt queue.
                var interrupt = _KernelInterruptQueue.dequeue();
                this.krnInterruptHandler(interrupt.irq, interrupt.params);
            }
            else if (_CPU.isExecuting) {
                _CPU.cycle();
            }
            else {
                this.krnTrace("Idle");
            }
        }
        //
        // Interrupt Handling
        //
        krnEnableInterrupts() {
            // Keyboard
            TSOS.Devices.hostEnableKeyboardInterrupt();
            // Put more here.
        }
        krnDisableInterrupts() {
            // Keyboard
            TSOS.Devices.hostDisableKeyboardInterrupt();
            // Put more here.
        }
        krnInterruptHandler(irq, params) {
            // This is the Interrupt Handler Routine.  See pages 8 and 560.
            // Trace our entrance here so we can compute Interrupt Latency by analyzing the log file later on. Page 766.
            this.krnTrace("Handling IRQ~" + irq);
            // Invoke the requested Interrupt Service Routine via Switch/Case rather than an Interrupt Vector.
            // Note: There is no need to "dismiss" or acknowledge the interrupts in our design here.
            //       Maybe the hardware simulation will grow to support/require that in the future.
            switch (irq) {
                case KEYBOARD_IRQ:
                    _krnKeyboardDriver.isr(params); // Kernel mode device driver
                    _StdIn.handleInput();
                    break;
                case DISK_IRQ:
                    _krnDiskDriver.isr(params); // Kernel mode device driver
                    break;
                case SYSCALL_IRQ:
                    _StdOut.putText(params);
                    break;
                case CONTEXT_SWITCH_IRQ:
                    var pid = _Scheduler.executeNextInReadyQueue();
                    TSOS.Control.hostLog("Context switch -> PID " + pid, "OS");
                    break;
                case TERMINATE_PROGRAM_IRQ:
                    _StdOut.advanceLine();
                    _StdOut.putText("PID " + params[0]);
                    _StdOut.advanceLine();
                    _StdOut.putText("Wait time: " + params[1] + " cycles.");
                    _StdOut.advanceLine();
                    _StdOut.putText("Turnaround time: " + (params[1] + params[2]) + " cycles."); // params[1] - wait cycles; params[2] - execute cycles
                    _Scheduler.terminateProcess(params[0]);
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case INVALID_OPCODE_IRQ:
                    _StdOut.advanceLine();
                    _StdOut.putText("Invalid op code. PID " + params + " terminated.");
                    _Scheduler.terminateProcess(params);
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case MEMORY_ACCESS_VIOLATION_IRQ:
                    _StdOut.advanceLine();
                    _StdOut.putText("Invalid memory access. PID " + params + " terminated.");
                    _Scheduler.terminateProcess(params);
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                default:
                    this.krnTrapError("Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]");
            }
        }
        //
        // OS Utility Routines
        //
        krnTrace(msg) {
            // Check globals to see if trace is set ON.  If so, then (maybe) log the message.
            if (_Trace) {
                if (msg === "Idle") {
                    // We can't log every idle clock pulse because it would lag the browser very quickly.
                    if (_OSclock % 10 == 0) {
                        // Check the CPU_CLOCK_INTERVAL in globals.ts for an
                        // idea of the tick rate and adjust this line accordingly.
                        TSOS.Control.hostLog(msg, "OS");
                    }
                }
                else {
                    TSOS.Control.hostLog(msg, "OS");
                }
            }
        }
        krnTrapError(msg) {
            TSOS.Control.hostLog("OS ERROR - TRAP: " + msg);
            TSOS.Control.hostDisplayBSOD();
            this.krnShutdown();
        }
    }
    TSOS.Kernel = Kernel;
})(TSOS || (TSOS = {}));
