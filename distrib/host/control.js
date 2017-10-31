///<reference path="../globals.ts" />
///<reference path="../os/canvastext.ts" />
/* ------------
     Control.ts

     Requires globals.ts.

     Routines for the hardware simulation, NOT for our client OS itself.
     These are static because we are never going to instantiate them, because they represent the hardware.
     In this manner, it's A LITTLE BIT like a hypervisor, in that the Document environment inside a browser
     is the "bare metal" (so to speak) for which we write code that hosts our client OS.
     But that analogy only goes so far, and the lines are blurred, because we are using TypeScript/JavaScript
     in both the host and client environments.

     This (and other host/simulation scripts) is the only place that we should see "web" code, such as
     DOM manipulation and event handling, and so on.  (Index.html is -- obviously -- the only place for markup.)

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */
//
// Control Services
//
var TSOS;
(function (TSOS) {
    class Control {
        static hostInit() {
            // This is called from index.html's onLoad event via the onDocumentLoad function pointer.
            // Get a global reference to the canvas.  TODO: Should we move this stuff into a Display Device Driver?
            _Canvas = document.getElementById('display');
            // Get a global reference to the drawing context.
            _DrawingContext = _Canvas.getContext("2d");
            // Enable the added-in canvas text functions (see canvastext.ts for provenance and details).
            TSOS.CanvasTextFunctions.enable(_DrawingContext); // Text functionality is now built in to the HTML5 canvas. But this is old-school, and fun, so we'll keep it.
            // Clear the log text box.
            // Use the TypeScript cast to HTMLInputElement
            document.getElementById("taHostLog").value = "";
            // Set focus on the start button.
            // Use the TypeScript cast to HTMLInputElement
            document.getElementById("btnStartOS").focus();
            // Check for our testing and enrichment core, which
            // may be referenced here (from index.html) as function Glados().
            if (typeof Glados === "function") {
                // function Glados() is here, so instantiate Her into
                // the global (and properly capitalized) _GLaDOS variable.
                _GLaDOS = new Glados();
                _GLaDOS.init();
            }
        }
        static hostLogHistoryString() {
            var hostLog = "";
            for (var i = 0; i < Control.hostLogHistory.length; i++) {
                var item = Control.hostLogHistory[i];
                hostLog = "clock:" + item.clock.toString() + " now: " + item.now + " <b>" + item.source + "</b>:<i>" + item.msg + "</i><br>" + hostLog;
            }
            return hostLog;
        }
        static hostLog(msg, source = "?") {
            // Note the OS CLOCK.
            var clock = _OSclock;
            // Note the REAL clock in milliseconds since January 1, 1970.
            //var now: number = new Date().getTime();
            var now = Control.hostGetCurrentDateTime(true);
            // Build the log string.
            var newLog = { clock, source, msg, now };
            var lastLog = Control.hostLogHistory[Control.hostLogHistory.length - 1];
            // Compare new log string with old; replace old with new if same source and msg
            if (lastLog !== undefined && source === lastLog.source && msg === lastLog.msg) {
                Control.hostLogHistory[Control.hostLogHistory.length - 1] = newLog; // source and msg same; replace old with new
            }
            else {
                Control.hostLogHistory.push(newLog); // new log string; append to hostLogHistory
            }
            // Update the log console.
            var taLog = document.getElementById("taHostLog");
            taLog.innerHTML = Control.hostLogHistoryString();
        }
        static hostGetCurrentDateTime(hideYear = false) {
            var currentDate = new Date();
            // JavaScript doesn't have any good date format options; the 0 & slice parts are to ensure uniform padding
            var dateString = currentDate.getFullYear() + "-" +
                ("0" + (currentDate.getMonth() + 1)).slice(-2) + "-" +
                ("0" + currentDate.getDate()).slice(-2) + " ";
            var timeString = ("0" + currentDate.getHours()).slice(-2) + ":" +
                ("0" + currentDate.getMinutes()).slice(-2) + ":" +
                ("0" + currentDate.getSeconds()).slice(-2);
            return hideYear === true ? timeString : dateString + timeString;
        }
        static hostUpdateDisplayDate() {
            // Update date in taskbarDate
            var currentDateString = Control.hostGetCurrentDateTime();
            document.getElementById("taskbarDate").innerHTML = currentDateString;
        }
        static hostSetStatus(msg) {
            document.getElementById("taskbarStatus").innerHTML = "[Status]" + msg;
        }
        static hostDisplayBSOD() {
            var volcanoImg = document.getElementById("volcano");
            // Change background volcano image to erupting variant, then move to front
            volcanoImg.src = "distrib/images/volcano-erupt.png";
            volcanoImg.style.zIndex = "999";
            // Unhide error message
            document.getElementById("errorMessage").style.display = "inline";
        }
        static hostLoad() {
            // Grab text from taProgramInput
            var program = document.getElementById("taProgramInput").value;
            program = program.replace(/\s+/g, ""); // Remove whitespace
            if (program.length == 0 || program.length > (SEGMENT_SIZE * 2)) {
                return -1; // Return value of -1 denotes invalid program
            }
            var re = new RegExp("[^0-9a-fA-F]"); // Match any non-hex character
            var invalidCharactersFound = re.test(program); // Test program for invalid characters
            if (invalidCharactersFound === true) {
                return -1; // Return value of -1 denotes invalid program
            }
            else {
                return TSOS.Mmu.createNewProcess(program); // Pass to Scheduler to finish load and assign PID
            }
        }
        static hostUpdateDisplay() {
            Control.hostUpdateDisplayCPU();
            Control.hostUpdateDisplayMemory();
            Control.hostUpdateDisplayProcesses();
        }
        static hostUpdateDisplayCPU() {
            var CPUElement = document.getElementById("displayCPU");
            var CPUData = "<table style='table-layout:fixed; width: 100%; text-align: center;'>" +
                "<tbody><tr><th>PC</th><th>ACC</th><th>X</th><th>Y</th><th>Z</th></tr>" +
                "<tr><td>" + TSOS.Utils.toHex(_CPU.PC) + "</td><td>" + TSOS.Utils.toHex(_CPU.Acc) + "</td><td>" + TSOS.Utils.toHex(_CPU.Xreg) +
                "</td><td>" + TSOS.Utils.toHex(_CPU.Yreg) + "</td><td>" + _CPU.Zflag + "</td></tr></tbody>" +
                "</table>";
            CPUElement.innerHTML = CPUData;
        }
        static hostUpdateDisplayMemory() {
            var memoryElement = document.getElementById("displayMemory");
            var memory = _Memory.getBytes(0, SEGMENT_SIZE * SEGMENT_COUNT);
            var memoryData = "<table style='width: 100%;'><tbody>";
            for (var i = 0; i < SEGMENT_SIZE * SEGMENT_COUNT; i++) {
                if ((i % 8) == 0) {
                    memoryData += `<tr><td style="font-weight: bold;">0x${TSOS.Utils.toHex(i, 3)}</td>`;
                }
                // Compare i with operator and operand indices. Apply appropriate id for highlighting
                var id = "";
                if (_CPU.pid !== -1 && i === Control.opCodeOperatorIndex) {
                    id = " id='operatorHighlight'";
                }
                else if (_CPU.pid !== -1 && Control.opCodeOperandIndices.includes(i)) {
                    id = " id='operandHighlight'";
                }
                memoryData += `<td${id}>${TSOS.Utils.toHex(memory[i])}</td>`; // id used for highlighting
                if ((i % 8) == 7) {
                    memoryData += "</tr>";
                }
            }
            memoryData += "</tbody></table>";
            memoryElement.innerHTML = memoryData;
            // Scroll to highlighted operand, if exists
            var operandHighlightElement = document.getElementById("operatorHighlight");
            if (operandHighlightElement !== null) {
                operandHighlightElement.scrollIntoView(true);
            }
        }
        static hostUpdateDisplayProcesses() {
            var processData = "<tbody><tr><th>PID</th><th>PC</th><th>ACC</th><th>X</th><th>Y</th>" +
                "<th>Z</th><th>Priority</th><th>State</th><th>Location</th></tr>";
            var processes = _Scheduler.residentList;
            if (processes.length == 0) {
                processData += "<tr><td colspan='9'>No programs in execution</td></tr>";
            }
            else {
                for (var i = 0; i < processes.length; i++) {
                    var process = processes[i];
                    var state = process.isExecuting === true ? "Executing" : "Ready";
                    var location = process.base !== -1 ? "Memory" : "Disk";
                    processData += `<tr><td>${process.pid}</td><td>${TSOS.Utils.toHex(process.PC)}</td><td>${TSOS.Utils.toHex(process.Acc)}</td>` +
                        `<td>${TSOS.Utils.toHex(process.Xreg)}</td><td>${TSOS.Utils.toHex(process.Yreg)}</td><td>${process.Zflag}</td>` +
                        `<td>${process.priority}</td><td>${state}</td><td>${location}</td></tr>`;
                }
            }
            var processesElement = document.getElementById("displayProcessesTable");
            processesElement.innerHTML = processData;
        }
        //
        // Host Events
        //
        static hostBtnStartOS_click(btn) {
            // Disable the (passed-in) start button...
            btn.disabled = true;
            // .. enable the Halt, Reset, and Toggle Single Step Mode buttons ...
            document.getElementById("btnHaltOS").disabled = false;
            document.getElementById("btnReset").disabled = false;
            document.getElementById("btnToggleSingleStepMode").disabled = false;
            // .. set focus on the OS console display ...
            document.getElementById("display").focus();
            // ... Create and initialize the CPU (because it's part of the hardware)  ...
            _CPU = new TSOS.Cpu(); // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.
            // ... Create Memory ...
            _Memory = new TSOS.Memory();
            // ... Create Scheduler ...
            _Scheduler = new TSOS.Scheduler();
            // ... then set the host clock pulse ...
            _hardwareClockID = setInterval(TSOS.Devices.hostClockPulse, CPU_CLOCK_INTERVAL);
            // .. and call the OS Kernel Bootstrap routine.
            _Kernel = new TSOS.Kernel();
            _Kernel.krnBootstrap(); // _GLaDOS.afterStartup() will get called in there, if configured.
            Control.hostUpdateDisplay();
        }
        static hostBtnHaltOS_click(btn) {
            Control.hostLog("Emergency halt", "host");
            Control.hostLog("Attempting Kernel shutdown.", "host");
            // Call the OS shutdown routine.
            _Kernel.krnShutdown();
            // Stop the interval that's simulating our clock pulse.
            clearInterval(_hardwareClockID);
            // TODO: Is there anything else we need to do here?
        }
        static hostBtnReset_click(btn) {
            // The easiest and most thorough way to do this is to reload (not refresh) the document.
            location.reload(true);
            // That boolean parameter is the 'forceget' flag. When it is true it causes the page to always
            // be reloaded from the server. If it is false or not specified the browser may reload the
            // page from its cache, which is not what we want.
        }
        static hostBtnToggle_Single_Step_Mode(btn) {
            _SSMode = !_SSMode;
            btn.value = "Single Step: " + (_SSMode === true ? "On" : "Off");
            document.getElementById("btnSingleStepCPU").disabled = !_SSMode;
            if (_CPU.pid !== -1) {
                _CPU.isExecuting = true;
            }
        }
        static hostBtnSingleStepCPU(btn) {
            if (_SSMode === true && _CPU.pid !== -1) {
                _CPU.isExecuting = true;
            }
        }
    }
    Control.hostLogHistory = [];
    Control.opCodeOperatorIndex = -1;
    Control.opCodeOperandIndices = [];
    TSOS.Control = Control;
})(TSOS || (TSOS = {}));
