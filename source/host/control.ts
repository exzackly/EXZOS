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

        public static hostLogHistory: { clock: number, source: string, msg: string, now: string }[] = [];

        public static hostInit(): void {
            // This is called from index.html's onLoad event via the onDocumentLoad function pointer.

            // Get a global reference to the canvas.
            _Canvas = <HTMLCanvasElement>document.getElementById('display');

            // Get a global reference to the drawing context.
            _DrawingContext = _Canvas.getContext("2d");

            // Enable the added-in canvas text functions (see canvastext.ts for provenance and details).
            CanvasTextFunctions.enable(_DrawingContext);   // Text functionality is now built in to the HTML5 canvas. But this is old-school, and fun, so we'll keep it.

            // Clear the log text box.
            // Use the TypeScript cast to HTMLInputElement
            (<HTMLInputElement> document.getElementById("taHostLog")).value = "";

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

        public static hostLogHistoryString(): string {
            var hostLog = "";
            for (var i = 0; i < Control.hostLogHistory.length; i++) {
                var item = Control.hostLogHistory[i];
                hostLog = "clock:" + item.clock.toString() + " now: " + item.now + " <b>" + item.source + "</b>:<i>" + item.msg + "</i><br>" + hostLog;
            }
            return hostLog;
        }

        public static hostLog(msg: string, source: string = "?"): void {
            // Note the OS CLOCK.
            var clock: number = _OSclock;

            // Note the REAL clock in milliseconds since January 1, 1970.
            //var now: number = new Date().getTime();
            var now: string = Control.hostGetCurrentDateTime(true);

            // Build the log string.
            var newLog = {clock, source, msg, now};
            var lastLog = Control.hostLogHistory[Control.hostLogHistory.length - 1];
            // Compare new log string with old; replace old with new if same source and msg
            if (lastLog !== undefined && source === lastLog.source && msg === lastLog.msg) {
                Control.hostLogHistory[Control.hostLogHistory.length - 1] = newLog; // source and msg same; replace old with new
            } else {
                Control.hostLogHistory.push(newLog); // new log string; append to hostLogHistory
            }
            // Update the log console.
            var taLog = <HTMLInputElement> document.getElementById("taHostLog");
            taLog.innerHTML = Control.hostLogHistoryString();
        }

        public static hostGetCurrentDateTime(hideYear: boolean = false): string {
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

        public static hostLoad(priority: number): number {
            // Grab text from taProgramInput
            var program = (<HTMLInputElement> document.getElementById("taProgramInput")).value;
            program = program.replace(/\s+/g, ""); // Remove whitespace
            if (program.length === 0 || program.length > (MEMORY_SEGMENT_SIZE * 2)) { // taProgramInput is empty or too large
                return -1; // Return value of -1 denotes invalid program
            }
            var re = new RegExp("[^0-9a-fA-F]"); // Match any non-hex character
            var invalidCharactersFound = re.test(program); // Test program for invalid characters
            if (invalidCharactersFound === true) {
                return -1; // Return value of -1 denotes invalid program
            } else {
                var progArray = program.match(/.{2}/g); // Break program into array of length 2 hex codes
                return Mmu.createNewProcess(priority, progArray); // Pass to Mmu to finish load and assign PID
            }
        }

        public static hostUpdateDisplay(): void {
            Control.hostUpdateDisplayCPU();
            Control.hostUpdateDisplayMemory();
            Control.hostUpdateDisplayProcesses();
        }

        public static hostUpdateDisplayCPU(): void {
            var IR = _CPU.IR === -1 ? "00" : Utils.toHex(_CPU.IR);
            var mnemonic = _CPU.IR === -1 ||_CPU.opCodeMap[_CPU.IR] === undefined ? "00" : _CPU.opCodeMap[_CPU.IR].mnemonic;
            var CPUElement = <HTMLInputElement> document.getElementById("displayCPU");
            var CPUData = "<table style='table-layout:fixed; width: 100%; text-align: center;'>" +
                "<tbody><tr><th>PC</th><th>ACC</th><th>IR</th><th>MNE</th><th>X</th><th>Y</th><th>Z</th></tr>" +
                "<tr><td>" + Utils.toHex(_CPU.PC) + "</td><td>" + Utils.toHex(_CPU.Acc) + "</td><td>" + IR +
                "</td><td>" + mnemonic + "</td><td>" + Utils.toHex(_CPU.Xreg) +
                "</td><td>" + Utils.toHex(_CPU.Yreg) + "</td><td>" + _CPU.Zflag + "</td></tr></tbody>" +
                "</table>";
            CPUElement.innerHTML = CPUData;
        }

        public static hostCreateMemoryTable(): void {
            var memoryElement = <HTMLInputElement> document.getElementById("displayMemory");
            var memoryData = "<table style='width: 100%;'><tbody>";
            for (var i = 0; i < MEMORY_SEGMENT_SIZE * MEMORY_SEGMENT_COUNT; i++) {
                if ((i % 8) == 0) {
                    memoryData += `<tr><td style="font-weight: bold;">0x${Utils.toHex(i, 3)}</td>`;
                }
                memoryData += `<td id="memoryCell${i}">00</td>`; // id used for highlighting
                if ((i % 8) == 7) {
                    memoryData += "</tr>";
                }
            }
            memoryData += "</tbody></table>";
            memoryElement.innerHTML = memoryData;
            Control.hostUpdateDisplayMemory();
        }

        public static hostUpdateDisplayMemory(): void {
            var memory = _Memory.getBytes(0, MEMORY_SEGMENT_SIZE * MEMORY_SEGMENT_COUNT);
            for (var i = 0; i < memory.length; i++) {
                var cellElement = <HTMLTableCellElement> document.getElementById("memoryCell" + i);
                cellElement.innerHTML = Utils.toHex(memory[i]);
            }
        }

        public static hostCreateDiskTable(): void {
            var diskElement = <HTMLInputElement> document.getElementById("displayDisk");
            var diskData = "<table style='width: 100%;'><tbody>";
            for (var track = 0; track < DISK_TRACK_COUNT; track++) {
                for (var sector = 0; sector < DISK_SECTOR_COUNT; sector++) {
                    for (var block = 0; block < DISK_BLOCK_COUNT; block++) {
                        var location = new DiskLocation(track, sector, block);
                        diskData += `<tr><td style="font-weight: bold;">${location.key()}</td>`;
                        diskData += `<td id="diskCell${location.key()}"><span style="color: indianred;">00</span>`;
                        diskData += `<span style="color: lightskyblue;">000000</span>`;
                        diskData += `${"00".repeat(DISK_BLOCK_WRITABLE_SIZE)}</td></tr>`;
                    }
                }
            }
            diskData += "</tbody></table>";
            diskElement.innerHTML = diskData;
        }

        public static hostUpdateDisplayDisk(): void {
            for (var track = 0; track < DISK_TRACK_COUNT; track++) {
                for (var sector = 0; sector < DISK_SECTOR_COUNT; sector++) {
                    for (var block = 0; block < DISK_BLOCK_COUNT; block++) {
                        var location = new DiskLocation(track, sector, block);
                        var cellElement = <HTMLTableCellElement> document.getElementById("diskCell" + location.key());
                        var data = _Disk.getBlock(location);
                        var hexData = data.map(x => Utils.toHex(x));
                        var cellData = `<span style="color: indianred;">${hexData[0]}</span>`;
                        cellData += `<span style="color: lightskyblue;">${hexData.slice(1, 4).join("")}</span>`;
                        cellData += hexData.slice(4).join("");
                        cellElement.innerHTML = cellData;
                    }
                }
            }
        }

        public static hostUpdateDisplayProcesses(): void {
            var processData = "<tbody><tr><th>PID</th><th>PC</th><th>ACC</th><th>IR</th><th>MNE</th><th>X</th><th>Y</th>" +
                "<th>Z</th><th>Prio</th><th>Swap</th><th>State</th></tr>";
            var processes = _Scheduler.residentList;
            if (processes.length == 0) {
                processData += "<tr><td colspan='11'>No programs in execution</td></tr>";
            } else {
                for (var i = 0; i < processes.length; i++) {
                    var process = processes[i];
                    var IR = process.IR === -1 ? "00" : Utils.toHex(process.IR);
                    var mnemonic = process.IR === -1 ? "00" : _CPU.opCodeMap[process.IR].mnemonic;
                    var swap = process.base !== -1 ? "N" : "Y";
                    var state = _Scheduler.readyQueue.peek() == process.pid ? "Executing" : "Ready";
                    processData += `<tr><td>${process.pid}</td><td>${Utils.toHex(process.PC)}</td><td>${Utils.toHex(process.Acc)}</td>` +
                        `<td>${IR}</td><td>${mnemonic}</td><td>${Utils.toHex(process.Xreg)}</td><td>${Utils.toHex(process.Yreg)}</td><td>${process.Zflag}</td>` +
                        `<td>${process.priority}</td><td>${swap}</td><td>${state}</td></tr>`;
                }
            }
            var processesElement = <HTMLTableElement> document.getElementById("displayProcessesTable");
            processesElement.innerHTML = processData;
        }

        public static hostHighlightMemoryCell(cell: number, type: number, scroll: boolean = false): void {
            var cellElement = <HTMLTableCellElement> document.getElementById("memoryCell" + cell);
            if (cellElement === null) {
                return;
            }
            var className = HIGHLIGHT_MAP[type];
            cellElement.className += className;
            if (scroll === true) {
                cellElement.scrollIntoView(scroll);
            }
        }

        public static hostRemoveHighlightFromMemoryCells(): void {
            for (let key in HIGHLIGHT_MAP) {
                if (HIGHLIGHT_MAP.hasOwnProperty(key)) {
                    var className = HIGHLIGHT_MAP[key];
                    var elements = document.getElementsByClassName(className);
                    while (elements.length > 0) { // elements is live; as class is removed from element it is removed from elements
                        elements[0].classList.remove(className);
                    }
                }
            }
        }

        public static hostScrollToBottomOfConsole(): void {
            var consoleContainer = document.getElementById("divConsoleContainer");
            consoleContainer.scrollTop = consoleContainer.scrollHeight;
        }

        //
        // Host Events
        //
        public static hostBtnStartOS_click(btn): void {
            if (btn.value === "Start") { // Check if we are starting OS or showing mobile keyboard
                btn.value = "SW keyboard"; // Repurpose button to show mobile keyboard

                // .. enable the Halt, Reset, and Toggle Single Step Mode buttons ...
                (<HTMLButtonElement>document.getElementById("btnHaltOS")).disabled = false;
                (<HTMLButtonElement>document.getElementById("btnReset")).disabled = false;
                (<HTMLButtonElement>document.getElementById("btnToggleSingleStepMode")).disabled = false;

                // .. set focus on the OS console display ...
                document.getElementById("display").focus();

                // ... Create and initialize the CPU (because it's part of the hardware)  ...
                _CPU = new Cpu();  // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.

                // ... Create Memory ...
                _Memory = new Memory();

                // ... Create Disk ...
                _Disk = new Disk();

                // ... Create Scheduler ...
                _Scheduler = new Scheduler();

                // ... Create displays ...
                Control.hostCreateMemoryTable();
                Control.hostCreateDiskTable();

                // ... then set the host clock pulse ...
                _hardwareClockID = setInterval(Devices.hostClockPulse, CPU_CLOCK_INTERVAL);
                // .. and call the OS Kernel Bootstrap routine.
                _Kernel = new Kernel();
                _Kernel.krnBootstrap();  // _GLaDOS.afterStartup() will get called in there, if configured.
            } else {
                document.getElementById("mobile").focus(); // Show mobile keyboard
            }
        }

        public static hostBtnHaltOS_click(btn): void {
            Control.hostLog("Emergency halt", "host");
            Control.hostLog("Attempting Kernel shutdown.", "host");
            // Call the OS shutdown routine.
            _Kernel.krnShutdown();
            // Stop the interval that's simulating our clock pulse.
            clearInterval(_hardwareClockID);
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
            (<HTMLButtonElement>document.getElementById("btnSingleStepCPU")).disabled = !_SSMode;
            if (_CPU.pid !== -1) {
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
