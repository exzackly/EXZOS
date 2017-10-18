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
module TSOS {

    export class Control {

        public static hostInit(): void {
            // This is called from index.html's onLoad event via the onDocumentLoad function pointer.

            // Get a global reference to the canvas.  TODO: Should we move this stuff into a Display Device Driver?
            _Canvas = <HTMLCanvasElement>document.getElementById('display');

            // Get a global reference to the drawing context.
            _DrawingContext = _Canvas.getContext("2d");

            // Enable the added-in canvas text functions (see canvastext.ts for provenance and details).
            CanvasTextFunctions.enable(_DrawingContext);   // Text functionality is now built in to the HTML5 canvas. But this is old-school, and fun, so we'll keep it.

            // Clear the log text box.
            // Use the TypeScript cast to HTMLInputElement
            (<HTMLInputElement> document.getElementById("taHostLog")).value="";

            // Set focus on the start button.
            // Use the TypeScript cast to HTMLInputElement
            (<HTMLInputElement> document.getElementById("btnStartOS")).focus();

            // Check for our testing and enrichment core, which
            // may be referenced here (from index.html) as function Glados().
            if (typeof Glados === "function") {
                // function Glados() is here, so instantiate Her into
                // the global (and properly capitalized) _GLaDOS variable.
                _GLaDOS = new Glados();
                _GLaDOS.init();
            }
        }

        public static hostLog(msg: string, source: string = "?"): void {
            // Note the OS CLOCK.
            var clock: number = _OSclock;

            // Note the REAL clock in milliseconds since January 1, 1970.
            //var now: number = new Date().getTime();
            var now: string = Control.hostGetCurrentDateTime(true);

            // Build the log string.
            var str: string = "({ clock:" + clock + ", source:" + source + ", msg:" + msg + ", now:" + now  + " })"  + "<br>";

            // Update the log console.
            var taLog = <HTMLInputElement> document.getElementById("taHostLog");
            taLog.innerHTML = str + taLog.innerHTML;
            // TODO in the future: Optionally update a log database or some streaming service.
        }

        public static hostGetCurrentDateTime(hideYear: boolean = false): string {
            var currentDate = new Date();
            // JavaScript doesn't have any good date format options; the 0 & slice parts are to ensure uniform padding
            var dateString = currentDate.getFullYear() + "-" +
                ("0"+(currentDate.getMonth()+1)).slice(-2) + "-" +
                ("0" + currentDate.getDate()).slice(-2) + " ";
            var timeString = ("0" + currentDate.getHours()).slice(-2) + ":" +
                ("0" + currentDate.getMinutes()).slice(-2) + ":" +
                ("0" + currentDate.getSeconds()).slice(-2);
            return hideYear === true ? timeString : dateString + timeString;
        }

        public static hostUpdateDisplayDate(): void {
            // Update date in taskbarDate
            var currentDateString = Control.hostGetCurrentDateTime();
            document.getElementById("taskbarDate").innerHTML = currentDateString;
        }

        public static hostSetStatus(msg: string): void {
            document.getElementById("taskbarStatus").innerHTML = "[Status]" + msg;
        }

        public static hostDisplayBSOD(): void {
            var volcanoImg = (<HTMLImageElement>document.getElementById("volcano"));
            // Change background volcano image to erupting variant, then move to front
            volcanoImg.src = "distrib/images/volcano-erupt.png";
            volcanoImg.style.zIndex = "999";
            // Unhide error message
            (<HTMLImageElement>document.getElementById("errorMessage")).style.display = "inline";
        }

        public static hostLoad(): number {
            // Grab text from taProgramInput
            var program = (<HTMLInputElement> document.getElementById("taProgramInput")).value;
            if (program.length == 0) { return -1; } // taProgramInput is empty; nothing to load
            program = program.replace(/\s+/g, ""); // Remove whitespace
            var re = new RegExp("[^0-9a-fA-F]"); // Match any non-hex character
            var invalidCharactersFound = re.test(program); // Test program for invalid characters
            if (invalidCharactersFound === true) {
                return -1; // Return value of -1 denotes invalid program
            } else {
                return _Scheduler.loadNewProcess(program); // Pass to Scheduler to finish load and assign PID
            }
        }

        public static hostUpdateDisplayCPU(): void {
            var CPUElement = <HTMLInputElement> document.getElementById("displayCPU");
            var CPUData = "<table style='table-layout:fixed; width: 100%; text-align: center;'>" +
                "<tbody><tr><th>PC</th><th>ACC</th><th>X</th><th>Y</th><th>Z</th></tr>" +
                "<tr><td>" + Utils.toHex(_CPU.PC) + "</td><td>" + Utils.toHex(_CPU.Acc) + "</td><td>" + Utils.toHex(_CPU.Xreg) +
                "</td><td>" + Utils.toHex(_CPU.Yreg) + "</td><td>" + _CPU.Zflag + "</td></tr></tbody>" +
                "</table>";
            CPUElement.innerHTML = CPUData;
        }

        public static hostUpdateDisplayMemory(): void {
            var memoryElement = <HTMLInputElement> document.getElementById("displayMemory");
            //todo: replace 768 with variable
            var memory = _Memory.getBytes(0, 768);
            var memoryData = "<table style='table-layout:fixed; width: 100%; text-align: center;'><tbody>";
            //todo: replace 768 with variable
            for (var i = 0; i < 768; i += 8) {
                memoryData += "<tr><td style='font-weight: bold'>0x" + Utils.toHex(i, 3) + "</td>" +
                    "<td align='right'>" + Utils.toHex(memory[i]) + "</td><td align='right'>" + Utils.toHex(memory[i+1]) + "</td>" +
                    "<td align='right'>" + Utils.toHex(memory[i+2]) + "</td><td align='right'>" + Utils.toHex(memory[i+3]) + "</td>" +
                    "<td align='right'>" + Utils.toHex(memory[i+4]) + "</td><td align='right'>" + Utils.toHex(memory[i+5]) + "</td>" +
                    "<td align='right'>" + Utils.toHex(memory[i+6]) + "</td><td align='right'>" + Utils.toHex(memory[i+7]) + "</td></tr>";
            }
            memoryData += "</tbody></table>";
            memoryElement.innerHTML = memoryData;
        }

        public static hostUpdateDisplayProcesses(): void {
            var processData = "<tbody><tr><th>PID</th><th>PC</th><th>ACC</th><th>X</th><th>Y</th>" +
                "<th>Z</th><th>Priority</th><th>State</th><th>Location</th></tr>";
            var PIDs = Object.keys(_Scheduler.residentList);
            if (PIDs.length == 0) {
                processData += "<tr><td colspan='9'>No programs in execution</td></tr>";
            } else {
                for (var i = 0; i < PIDs.length; i++) {
                    var process = _Scheduler.residentList[PIDs[i]];
                    var state = "";
                    if (process.isExecuting === true) {
                        state = "Executing";
                    } else {
                        state = _CPU.isExecuting === true ? "Waiting" : "Ready";
                    }
                    var location = process.segment >= 0 && process.segment < SEGMENT_COUNT ? "Memory" : "Disk";
                    processData += `<tr><td>${process.pid}</td><td>${Utils.toHex(process.PC)}</td><td>${Utils.toHex(process.Acc)}</td>` +
                        `<td>${Utils.toHex(process.Xreg)}</td><td>${Utils.toHex(process.Yreg)}</td><td>${process.Zflag}</td>` +
                        `<td>${process.priority}</td><td>${state}</td><td>${location}</td></tr>`;
                }
            }
            var processesElement = <HTMLTableElement> document.getElementById("displayProcessesTable");
            processesElement.innerHTML = processData;
        }

        //
        // Host Events
        //
        public static hostBtnStartOS_click(btn): void {
            // Disable the (passed-in) start button...
            btn.disabled = true;

            // .. enable the Halt and Reset buttons ...
            (<HTMLButtonElement>document.getElementById("btnHaltOS")).disabled = false;
            (<HTMLButtonElement>document.getElementById("btnReset")).disabled = false;

            // .. set focus on the OS console display ...
            document.getElementById("display").focus();

            // ... Create and initialize the CPU (because it's part of the hardware)  ...
            _CPU = new Cpu();  // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.
            _CPU.init();       //       There's more to do, like dealing with scheduling and such, but this would be a start. Pretty cool.

            // ... Create Memory ...
            _Memory = new Memory();

            // ... Create Scheduler ...
            _Scheduler = new Scheduler();

            // ... then set the host clock pulse ...
            _hardwareClockID = setInterval(Devices.hostClockPulse, CPU_CLOCK_INTERVAL);
            // .. and call the OS Kernel Bootstrap routine.
            _Kernel = new Kernel();
            _Kernel.krnBootstrap();  // _GLaDOS.afterStartup() will get called in there, if configured.
        }

        public static hostBtnHaltOS_click(btn): void {
            Control.hostLog("Emergency halt", "host");
            Control.hostLog("Attempting Kernel shutdown.", "host");
            // Call the OS shutdown routine.
            _Kernel.krnShutdown();
            // Stop the interval that's simulating our clock pulse.
            clearInterval(_hardwareClockID);
            // TODO: Is there anything else we need to do here?
        }

        public static hostBtnReset_click(btn): void {
            // The easiest and most thorough way to do this is to reload (not refresh) the document.
            location.reload(true);
            // That boolean parameter is the 'forceget' flag. When it is true it causes the page to always
            // be reloaded from the server. If it is false or not specified the browser may reload the
            // page from its cache, which is not what we want.
        }

        public static hostBtnToggle_Single_Step_Mode(btn): void {
            _SSMode = !_SSMode;
            btn.value = "Single Step: " + (_SSMode === true ? "On" : "Off");
            if (_Scheduler.residentList[_CPU.pid].isExecuting === true) {
                _CPU.isExecuting = true;
            }
        }

        public static hostBtnSingleStepCPU(btn): void {
            if (_SSMode === true && _CPU.pid !== -1) { // Single Step Mode on and CPU has process loaded
                _CPU.isExecuting = true;
            }
        }

    }
}
