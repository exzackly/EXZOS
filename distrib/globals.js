/* ------------
   Globals.ts

   Global CONSTANTS and _Variables.
   (Global over both the OS and Hardware Simulation / Host.)

   This code references page numbers in the text book:
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */
//
// Global CONSTANTS (TypeScript 1.5 introduced const. Very cool.)
//
const APP_NAME = "EXZOS"; // Pronounce it "exhaust", it's much cooler that way
const APP_AUTHOR = "EXZACKLY";
const APP_VERSION = "0.07"; // What did you expect?
const CPU_CLOCK_INTERVAL = 100; // This is in ms (milliseconds) so 1000 = 1 second.
const KEYBOARD_IRQ = 0;
const DISK_IRQ = 1;
const SYSCALL_IRQ = 2;
const CONTEXT_SWITCH_IRQ = 3;
const TERMINATE_PROGRAM_IRQ = 4;
const INVALID_OPCODE_IRQ = 5;
const MEMORY_ACCESS_VIOLATION_IRQ = 6;
const MEMORY_SEGMENT_COUNT = 3;
const MEMORY_SEGMENT_SIZE = 256;
const DISK_TRACK_COUNT = 4;
const DISK_SECTOR_COUNT = 8;
const DISK_BLOCK_COUNT = 8;
const DISK_BLOCK_SIZE = 64;
const DISK_BLOCK_RESERVED_SIZE = 4; // 4 bytes reserved per block [used, next track, next sector, next block, ...data...]
const DISK_BLOCK_WRITABLE_SIZE = DISK_BLOCK_SIZE - DISK_BLOCK_RESERVED_SIZE;
const HIGHLIGHT_MAP = {
    1: "operandHighlight",
    2: "operatorHighlight",
    3: "memoryAccessHighlight"
};
//
// Global Variables
//
var _CPU; // Utilize TypeScript's type annotation system to ensure that _CPU is an instance of the Cpu class.
var _SSMode = false; // Single step mode
var _Memory; // Utilize TypeScript's type annotation system to ensure that _Memory is an instance of the Memory class.
var _Disk; // Utilize TypeScript's type annotation system to ensure that _Disk is an instance of the Disk class.
var _Scheduler; // Utilize TypeScript's type annotation system to ensure that _Scheduler is an instance of the Scheduler class.
var _SchedulerQuantum = 6; // Quantum for Scheduler. Defaults to 6
var _OSclock = 0; // Page 23.
var _Mode = 0; // (currently unused)  0 = Kernel Mode, 1 = User Mode.  See page 21.
var _Canvas; // Initialized in Control.hostInit().
var _DrawingContext; // = _Canvas.getContext("2d");  // Assigned here for type safety, but re-initialized in Control.hostInit() for OCD and logic.
var _DefaultFontFamily = "sans"; // Ignored, I think. The was just a place-holder in 2008, but the HTML canvas may have use for it.
var _DefaultFontSize = 13;
var _FontHeightMargin = 4; // Additional space added to font size when advancing a line.
var _CanvasDefaultHeight = 500;
var _Trace = true; // Default the OS trace to be on.
// The OS Kernel and its queues.
var _Kernel;
var _KernelInterruptQueue; // Initializing this to null (which I would normally do) would then require us to specify the 'any' type, as below.
var _KernelInputQueue = null; // Is this better? I don't like uninitialized variables. But I also don't like using the type specifier 'any'
var _KernelBuffers = null; // when clearly 'any' is not what we want. There is likely a better way, but what is it?
// Standard input and output
var _StdIn; // Same "to null or not to null" issue as above.
var _StdOut;
// UI
var _Console;
var _OsShell;
// Global Device Driver Objects - page 12
var _krnKeyboardDriver;
var _krnDiskDriver;
var _hardwareClockID = null;
// For testing (and enrichment)...
var Glados = null; // This is the function Glados() in glados.js on Labouseur.com.
var _GLaDOS = null; // If the above is linked in, this is the instantiated instance of Glados.
var onDocumentLoad = function () {
    TSOS.Control.hostInit();
};
