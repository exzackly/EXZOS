///<reference path="../globals.ts" />
///<reference path="../utils.ts" />
///<reference path="shellCommand.ts" />
///<reference path="userCommand.ts" />
/* ------------
   Shell.ts

   The OS Shell - The "command line interface" (CLI) for the console.

    Note: While fun and learning are the primary goals of all enrichment center activities,
          serious injuries may occur when trying to write your own Operating System.
   ------------ */
var TSOS;
(function (TSOS) {
    class Shell {
        constructor(promptStr = ">") {
            this.promptStr = promptStr;
            this.commandMap = {
                "ver": { desc: "- Displays the current version data. Persistence is key...", fn: this.shellVer },
                "help": { desc: "- This is the help command. Seek help.", fn: this.shellHelp },
                "shutdown": { desc: "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running.", fn: this.shellShutdown },
                "cls": { desc: "- Clears the screen and resets the cursor position.", fn: this.shellCls },
                "man": { desc: "<topic> - Displays the MANual page for <topic>.", fn: this.shellMan },
                "trace": { desc: "<on | off> - Turns the OS trace on or off.", fn: this.shellTrace },
                "rot13": { desc: "<string> - Does rot13 obfuscation on <string>.", fn: this.shellRot13 },
                "prompt": { desc: "<string> - Sets the prompt.", fn: this.shellPrompt },
                "date": { desc: "- Displays the current date and time.", fn: this.shellDate },
                "whereami": { desc: "- Displays the user's current location.", fn: this.shellWhereAmI },
                "procrastinate": { desc: "- Execute standard workflow. Persistence is key...", fn: this.shellProcrastinate },
                "status": { desc: "<string> - Sets the status in the taskbar.", fn: this.shellStatus },
                "erupt": { desc: "- Pompeii.", fn: this.shellErupt },
                "load": { desc: "<priority?> - Loads program from User Program Input. Optionally specify priority.", fn: this.shellLoad },
                "run": { desc: "<pid> - Runs program with specified PID.", fn: this.shellRun },
                "ps": { desc: "- Displays a list of the running processes and their IDs.", fn: this.shellPs },
                "kill": { desc: "<pid> - Kills the process with specified PID.", fn: this.shellKill },
                "clearmem": { desc: "Clears all memory partitions.", fn: this.shellClearMem },
                "runall": { desc: "Runs all programs.", fn: this.shellRunAll },
                "quantum": { desc: "<int> - Sets the round robin quantum.", fn: this.shellQuantum },
                "create": { desc: "<filename> - Creates file with specified filename.", fn: this.shellCreate },
                "read": { desc: "<filename> - Displays the contents of file with specified filename.", fn: this.shellRead },
                "write": { desc: "<filename> \"<data>\" - Writes the data inside the quotes to file with specified filename.", fn: this.shellWrite },
                "delete": { desc: "<filename> - Deletes file with specified filename.", fn: this.shellDelete },
                "format": { desc: "<-quick | -full?> - Initializes all blocks in all sectors in all tracks.", fn: this.shellFormat },
                "ls": { desc: "<-l?> - Lists the files currently stored on the disk.", fn: this.shellLs },
                "setschedule": { desc: "<rr | fcfs | priority> - Sets the CPU scheduling algorithm.", fn: this.shellSetSchedule },
                "getschedule": { desc: "- Displays the CPU scheduling algorithm in use.", fn: this.shellGetSchedule },
                "chkdsk": { desc: "- Recovers deleted files and reclaims unused blocks.", fn: this.shellChkdsk }
            };
            this.putPrompt();
        }
        putPrompt() {
            _StdOut.putText(this.promptStr);
        }
        handleInput(buffer) {
            _Kernel.krnTrace("Shell Command~" + buffer);
            //
            // Parse the input...
            //
            var userCommand = this.parseInput(buffer);
            // ... and assign the command and args to local variables.
            var cmd = userCommand.command;
            var args = userCommand.args;
            //
            // Determine the command
            //
            var command = this.commandMap[cmd];
            /// Execute command if found
            if (command !== undefined) {
                this.execute(command.fn, args);
            }
            else {
                this.execute(this.shellInvalidCommand);
            }
        }
        // Note: args is an option parameter, ergo the ? which allows TypeScript to understand that.
        execute(fn, args) {
            // We just got a command, so advance the line...
            _StdOut.advanceLine();
            // ... call the command function passing in the args with some über-cool functional programming ...
            fn.call(this, args);
            // Check to see if we need to advance the line again
            if (_StdOut.currentXPosition > 0) {
                _StdOut.advanceLine();
            }
            // ... and finally write the prompt again.
            this.putPrompt();
        }
        parseInput(buffer) {
            var retVal = new TSOS.UserCommand();
            // 1. Remove leading and trailing spaces.
            buffer = TSOS.Utils.trim(buffer);
            // 2. Separate on spaces so we can determine the command and command-line args, if any.
            var tempList = buffer.split(" ");
            // 3. Take the first (zeroth) element and use that as the command.
            var cmd = tempList.shift(); // Yes, you can do that to an array in JavaScript.  See the Queue class.
            // 3.1 Lower-case it.
            cmd = cmd.toLowerCase();
            // 3.2 Remove any left-over spaces.
            cmd = TSOS.Utils.trim(cmd);
            // 3.3 Record it in the return value.
            retVal.command = cmd;
            // 4. Now create the args array from what's left.
            for (var i in tempList) {
                var arg = TSOS.Utils.trim(tempList[i]);
                if (arg != "") {
                    retVal.args[retVal.args.length] = tempList[i];
                }
            }
            return retVal;
        }
        wasCommandRepeated() {
            return (_Console.commandHistory[_Console.commandHistory.length - 1] == _Console.commandHistory[_Console.commandHistory.length - 2]);
        }
        //
        // Shell Command Functions.  Kinda not part of Shell() class exactly, but
        // called from here, so kept here to avoid violating the law of least astonishment.
        //
        shellInvalidCommand() {
            _StdOut.putText("Invalid Command. ");
            _StdOut.putText("Type 'help' for, well... help.");
        }
        shellVer(args) {
            if (!this.wasCommandRepeated()) {
                _StdOut.putText("Just assume it's still in alpha.");
            }
            else {
                _StdOut.putText("If you must know...");
                _StdOut.advanceLine();
                _StdOut.putText(`${APP_NAME} version ${APP_VERSION}.`);
            }
        }
        shellHelp(args) {
            _StdOut.putText("Commands:");
            var commands = Object.keys(this.commandMap);
            for (var i = 0; i < commands.length; i++) {
                _StdOut.advanceLine();
                _StdOut.putText(`  ${commands[i]} ${this.commandMap[commands[i]].desc}`);
            }
        }
        shellShutdown(args) {
            _StdOut.putText("Shutting down...");
            // Call Kernel shutdown routine.
            _Kernel.krnShutdown();
        }
        shellCls(args) {
            _StdOut.clearScreen();
            _StdOut.resetXY();
        }
        shellMan(args) {
            if (args.length > 0) {
                var command = this.commandMap[args[0]];
                /// Execute command if found
                var description = command !== undefined ? command.desc : "- Command not found";
                if (args[0] === "help") {
                    _StdOut.putText("Help displays a list of all available commands.");
                    _StdOut.advanceLine();
                }
                _StdOut.putText(args[0] + " " + description);
            }
            else {
                _StdOut.putText("Usage: man <topic>  Please supply a topic.");
            }
        }
        shellTrace(args) {
            if (args.length > 0) {
                if (args[0] === "on") {
                    _Trace = true;
                    _StdOut.putText("Trace ON.");
                }
                else if (args[0] === "off") {
                    _Trace = false;
                    _StdOut.putText("Trace OFF.");
                }
                else {
                    _StdOut.putText("Invalid argument.  Usage: trace <on | off>.");
                }
            }
            else {
                _StdOut.putText("Usage: trace <on | off>.");
            }
        }
        shellRot13(args) {
            if (args.length > 0) {
                // Requires Utils.ts for rot13() function.
                _StdOut.putText(args.join(' ') + " = '" + TSOS.Utils.rot13(args.join(' ')) + "'");
            }
            else {
                _StdOut.putText("Usage: rot13 <string>  Please supply a string.");
            }
        }
        shellPrompt(args) {
            if (args.length > 0) {
                this.promptStr = args[0];
            }
            else {
                _StdOut.putText("Usage: prompt <string>  Please supply a string.");
            }
        }
        shellDate(args) {
            var currentDateString = TSOS.Control.hostGetCurrentDateTime();
            _StdOut.putText(currentDateString);
        }
        shellWhereAmI(args) {
            _StdOut.putText("Not far enough.");
        }
        shellProcrastinate(args) {
            if (!this.wasCommandRepeated()) {
                _StdOut.putText("Later.");
            }
            else {
                _StdOut.putText("*sigh* I'll do it tomorrow.");
            }
        }
        shellStatus(args) {
            if (args.length > 0) {
                TSOS.Control.hostSetStatus(args.join(" "));
            }
            else {
                _StdOut.putText("Usage: status <string>  Please supply a string.");
            }
        }
        shellErupt(args) {
            _StdOut.putText("User initiated EXZOS shutdown.");
            _Kernel.krnTrapError("User initiated OS error");
        }
        shellLoad(args) {
            var priority = 0;
            if (args.length > 0) {
                if (isNaN(parseInt(args[0])) || parseInt(args[0]) < 0) {
                    _StdOut.putText("Usage: load <priority?>  Please supply a valid positive integer priority greater than 0.");
                    return;
                }
                priority = parseInt(args[0]);
            }
            var pid = TSOS.Control.hostLoad(priority); // Have Control verify and load program
            if (pid === -1) {
                _StdOut.putText("Invalid program. Valid characters are 0-9, a-z, and A-Z.");
            }
            else {
                _StdOut.putText(`Program loaded. PID ${pid}`);
            }
        }
        shellRun(args) {
            if (args.length > 0) {
                var pid = parseInt(args[0]);
                var isLoaded = _Scheduler.loadProcessOnCPU(pid);
                if (isLoaded === -1) {
                    _StdOut.putText("PID " + args[0] + " not found. Please supply a valid PID.");
                }
                else if (isLoaded === -2) {
                    _StdOut.putText("Cannot run PID " + args[0] + ". Please wait until all running processes are completed.");
                }
            }
            else {
                _StdOut.putText("Usage: run <PID>  Please supply a valid PID.");
            }
        }
        shellPs(args) {
            var processes = _Scheduler.residentList;
            for (var i = 0; i < processes.length; i++) {
                var process = processes[i];
                var state = _Scheduler.readyQueue.peek() == process.pid ? "Executing" : "Ready";
                var location = process.base !== -1 ? "Memory" : "Disk";
                _StdOut.putText(process.pid + " " + state + " " + location);
                _StdOut.advanceLine();
            }
        }
        shellKill(args) {
            if (args.length > 0) {
                var pid = parseInt(args[0]);
                var process = _Scheduler.getProcessForPid(pid);
                if (process !== null) {
                    _StdOut.putText("PID " + pid + " killed.");
                    _KernelInterruptQueue.enqueue(new TSOS.Interrupt(TERMINATE_PROGRAM_IRQ, [pid, process.waitCycles, process.executeCycles]));
                }
                else {
                    _StdOut.putText("PID " + args[0] + " not found. Please supply a valid PID.");
                }
            }
            else {
                _StdOut.putText("Usage: kill <PID>  Please supply a valid PID.");
            }
        }
        shellClearMem(args) {
            TSOS.Mmu.zeroMemory();
            TSOS.Control.hostRemoveHighlightFromMemoryCells();
            _StdOut.putText("All memory partitions cleared.");
        }
        shellRunAll(args) {
            var running = _Scheduler.runAll();
            if (running === -1) {
                _StdOut.putText("Runall failed; nothing to run.");
            }
            else if (running === -2) {
                _StdOut.putText("Cannot runall. Please wait until all running processes are completed.");
            }
        }
        shellQuantum(args) {
            if (_Scheduler.schedulingType !== TSOS.SchedulingType.roundRobin) {
                _StdOut.putText("Scheduling algorithm must be set to round robin to set quantum.");
            }
            else if (args.length > 0 && !isNaN(parseInt(args[0])) && parseInt(args[0]) > 0) {
                _SchedulerQuantum = parseInt(args[0]);
                _StdOut.putText("Round robin quantum set to " + args[0] + ".");
            }
            else {
                _StdOut.putText("Usage: quantum <int>  Please supply a valid positive integer quantum greater than 0.");
            }
        }
        shellCreate(args) {
            if (args.length > 0) {
                TSOS.Devices.hostCreateFileOnDisk(args[0]);
            }
            else {
                _StdOut.putText("Usage: create <filename>  Please supply a valid filename.");
            }
        }
        shellRead(args) {
            if (args.length > 0) {
                TSOS.Devices.hostReadFileFromDisk(args[0]);
            }
            else {
                _StdOut.putText("Usage: read <filename>  Please supply a valid filename.");
            }
        }
        shellWrite(args) {
            if (args.length > 0) {
                var filename = args[0];
                var data = args.slice(1).join(" ");
                if (data.length <= 1 || data[0] !== "\"" || data[data.length - 1] !== "\"") {
                    _StdOut.putText("Usage: write <filename> \"<data>\"  Please supply a valid filename and data enclosed in quotes.");
                    return;
                }
                data = data.substring(1, data.length - 1);
                TSOS.Devices.hostWriteFileToDisk(filename, data);
            }
            else {
                _StdOut.putText("Usage: write <filename> \"<data>\"  Please supply a valid filename and data enclosed in quotes.");
            }
        }
        shellDelete(args) {
            if (args.length > 0) {
                TSOS.Devices.hostDeleteFileFromDisk(args[0]);
            }
            else {
                _StdOut.putText("Usage: delete <filename>  Please supply a valid filename.");
            }
        }
        shellFormat(args) {
            if (_CPU.isExecuting === true) {
                _StdOut.putText("Cannot format. Please wait until all running processes are completed.");
                return;
            }
            if (args.length === 0 || args.length > 0 && args[0] === "-full") {
                TSOS.Devices.hostFormatDisk(TSOS.FormatType.Full);
            }
            else if (args.length > 0 && args[0] === "-quick") {
                TSOS.Devices.hostFormatDisk(TSOS.FormatType.Quick);
            }
            else {
                _StdOut.putText("Invalid flag: format <-quick | -full?>  Please supply a valid flag.");
            }
        }
        shellLs(args) {
            if (args.length > 0 && args[0] === "-l") {
                TSOS.Devices.hostListFilesOnDisk(TSOS.LSType.Long);
            }
            else if (args.length === 0) {
                TSOS.Devices.hostListFilesOnDisk(TSOS.LSType.Normal);
            }
            else {
                _StdOut.putText("Invalid flag: ls <-l?>  Please supply a valid flag.");
            }
        }
        shellSetSchedule(args) {
            if (args.length > 0) {
                if (args[0] === "rr") {
                    _Scheduler.setSchedule(TSOS.SchedulingType.roundRobin);
                    _StdOut.putText("Scheduling algorithm set to round robin.");
                }
                else if (args[0] === "fcfs") {
                    _Scheduler.setSchedule(TSOS.SchedulingType.firstComeFirstServe);
                    _StdOut.putText("Scheduling algorithm set to first come first serve.");
                }
                else if (args[0] === "priority") {
                    _Scheduler.setSchedule(TSOS.SchedulingType.priority);
                    _StdOut.putText("Scheduling algorithm set to priority.");
                }
                else {
                    _StdOut.putText("Usage: setschedule <rr | fcfs | priority>  Please supply a valid scheduling option.");
                }
            }
            else {
                _StdOut.putText("Usage: setschedule <rr | fcfs | priority>  Please supply a valid scheduling option.");
            }
        }
        shellGetSchedule(args) {
            _StdOut.putText(_Scheduler.schedulingType);
        }
        shellChkdsk(args) {
            TSOS.Devices.hostCheckDisk();
        }
    }
    TSOS.Shell = Shell;
})(TSOS || (TSOS = {}));
