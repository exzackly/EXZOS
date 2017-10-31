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

// TODO: Write a base class / prototype for system services and let Shell inherit from it.

module TSOS {
    export class Shell {

        constructor(public  promptStr = ">") {
            this.putPrompt();
        }

        public commandMap = {
            "ver": {desc: "- Displays the current version data. Persistence is key...", fn: this.shellVer},
            "help": {desc: "- This is the help command. Seek help.", fn: this.shellHelp},
            "shutdown": {desc: "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running.", fn: this.shellShutdown},
            "cls": {desc: "- Clears the screen and resets the cursor position.", fn: this.shellCls},
            "man": {desc: "<topic> - Displays the MANual page for <topic>.", fn: this.shellMan},
            "trace": {desc: "<on | off> - Turns the OS trace on or off.", fn: this.shellTrace},
            "rot13": {desc: "<string> - Does rot13 obfuscation on <string>.", fn: this.shellRot13},
            "prompt": {desc: "<string> - Sets the prompt.", fn: this.shellPrompt},
            "date": {desc: "- Displays the current date and time.", fn: this.shellDate},
            "whereami": {desc: "- Displays the user's current location.", fn: this.shellWhereAmI},
            "procrastinate": {desc: "- Execute standard workflow. Persistence is key...", fn: this.shellProcrastinate},
            "status": {desc: "<string> - Sets the status in the taskbar.", fn: this.shellStatus},
            "erupt": {desc: "- Pompeii.", fn: this.shellErupt},
            "load": {desc: "- Loads program from User Program Input.", fn: this.shellLoad},
            "run": {desc: "<pid> - Runs program with specified PID.", fn: this.shellRun},
            "ps": {desc: "- Displays a list of the running processes and their IDs.", fn: this.shellPs},
            "kill": {desc: "<pid> - Kills the process with specified PID.", fn: this.shellKill},
            "clearmem": {desc: "Clears all memory partitions.", fn: this.shellClearMem}
        }

        public putPrompt() {
            _StdOut.putText(this.promptStr);
        }

        public handleInput(buffer) {
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
            } else {
                this.execute(this.shellInvalidCommand);
            }
        }

        // Note: args is an option parameter, ergo the ? which allows TypeScript to understand that.
        public execute(fn, args?) {
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

        public parseInput(buffer): UserCommand {
            var retVal = new UserCommand();

            // 1. Remove leading and trailing spaces.
            buffer = Utils.trim(buffer);

            // 2. Separate on spaces so we can determine the command and command-line args, if any.
            var tempList = buffer.split(" ");

            // 3. Take the first (zeroth) element and use that as the command.
            var cmd = tempList.shift();  // Yes, you can do that to an array in JavaScript.  See the Queue class.
            // 3.1 Lower-case it.
            cmd = cmd.toLowerCase();
            // 3.2 Remove any left-over spaces.
            cmd = Utils.trim(cmd);
            // 3.3 Record it in the return value.
            retVal.command = cmd;

            // 4. Now create the args array from what's left.
            for (var i in tempList) {
                var arg = Utils.trim(tempList[i]);
                if (arg != "") {
                    retVal.args[retVal.args.length] = tempList[i];
                }
            }
            return retVal;
        }

        public wasCommandRepeated(): boolean {
            return (_Console.commandHistory[_Console.commandHistory.length-1] == _Console.commandHistory[_Console.commandHistory.length-2]);
        }

        //
        // Shell Command Functions.  Kinda not part of Shell() class exactly, but
        // called from here, so kept here to avoid violating the law of least astonishment.
        //
        public shellInvalidCommand() {
            _StdOut.putText("Invalid Command. ");
            _StdOut.putText("Type 'help' for, well... help.");
        }

        public shellVer(args) {
            if (!this.wasCommandRepeated()) {
                _StdOut.putText("Just assume it's still in alpha");
            } else {
                _StdOut.putText("If you must know...");
                _StdOut.advanceLine();
                _StdOut.putText(APP_NAME + " version " + APP_VERSION);
            }
        }

        public shellHelp(args) {
            _StdOut.putText("Commands:");
            var commands = Object.keys(this.commandMap);
            for (var i = 0; i < commands.length; i++) {
                _StdOut.advanceLine();
                _StdOut.putText("  " + commands[i] + " " + this.commandMap[commands[i]].desc);
            }
        }

        public shellShutdown(args) {
             _StdOut.putText("Shutting down...");
             // Call Kernel shutdown routine.
            _Kernel.krnShutdown();
            // TODO: Stop the final prompt from being displayed.  If possible.  Not a high priority.  (Damn OCD!)
        }

        public shellCls(args) {
            _StdOut.clearScreen();
            _StdOut.resetXY();
        }

        public shellMan(args) {
            if (args.length > 0) {
                var command = this.commandMap[args[0]];
                /// Execute command if found
                var description = command !== undefined ? command.desc : "- Command not found";
                if (args[0] === "help") {
                    _StdOut.putText("Help displays a list of all available commands.");
                    _StdOut.advanceLine();
                }
                _StdOut.putText(args[0] + " " + description);
            } else {
                _StdOut.putText("Usage: man <topic>  Please supply a topic.");
            }
        }

        public shellTrace(args) {
            if (args.length > 0) {
                if (args[0] === "on") {
                    _Trace = true;
                    _StdOut.putText("Trace ON");
                } else if (args[0] === "off") {
                    _Trace = false;
                    _StdOut.putText("Trace OFF");
                } else {
                    _StdOut.putText("Invalid argument.  Usage: trace <on | off>.");
                }
            } else {
                _StdOut.putText("Usage: trace <on | off>");
            }
        }

        public shellRot13(args) {
            if (args.length > 0) {
                // Requires Utils.ts for rot13() function.
                _StdOut.putText(args.join(' ') + " = '" + Utils.rot13(args.join(' ')) +"'");
            } else {
                _StdOut.putText("Usage: rot13 <string>  Please supply a string.");
            }
        }

        public shellPrompt(args) {
            if (args.length > 0) {
                this.promptStr = args[0];
            } else {
                _StdOut.putText("Usage: prompt <string>  Please supply a string.");
            }
        }

        public shellDate(args) {
            var currentDateString = Control.hostGetCurrentDateTime();
            _StdOut.putText(currentDateString);
        }

		public shellWhereAmI(args) {
            _StdOut.putText("Not far enough");
        }

		public shellProcrastinate(args) {
			if (!this.wasCommandRepeated()) {
				_StdOut.putText("Later");
			} else {
				_StdOut.putText("*sigh* I'll do it tomorrow");
			}
        }

        public shellStatus(args) {
            if (args.length > 0) {
                Control.hostSetStatus(args.join(" "));
            } else {
                _StdOut.putText("Usage: status <string>  Please supply a string.");
            }
        }

        public shellErupt(args) {
            _StdOut.putText("User initiated EXZOS shutdown");
            _Kernel.krnTrapError("User initiated OS error");
        }

        public shellLoad(args) {
            var pid = Control.hostLoad(); // Have Control verify and load program
            if (pid === -1) {  // pid value of -1 denotes invalid program
                _StdOut.putText("Invalid program. Valid characters are 0-9, a-z, and A-Z");
            } else if (pid === -2) {  // pid value of -2 denotes insufficient memory
                _StdOut.putText("Insufficient memory. Please clear up memory before loading new process");
            } else {
                _StdOut.putText("Program loaded. PID " + pid);
            }
        }

        public shellRun(args) {
            if (args.length > 0) {
                var pid = parseInt(args[0]);
                var isLoaded = _Scheduler.loadProcessOnCPU(pid);
                if (!isLoaded) {
                    _StdOut.putText("PID " + args[0] + " not found. Please supply a valid PID.");
                }
            } else {
                _StdOut.putText("Usage: run <PID>  Please supply a valid PID.");
            }
        }

        public shellPs(args) {
            var processes = _Scheduler.residentList;
            for (var i = 0; i < processes.length; i++) {
                var process = processes[i];
                var location = process.base !== -1 ? "Memory" : "Disk";
                _StdOut.putText(process.pid + " " + location);
                _StdOut.advanceLine();
            }
        }

        public shellKill(args) {
            if (args.length > 0) {
                var pid = parseInt(args[0]);
                if (_Scheduler.getProcessForPid(pid) !== null) {
                    _StdOut.putText("PID " + pid + " killed.");
                    _KernelInterruptQueue.enqueue(new Interrupt(TERMINATE_PROGRAM_IRQ, pid));
                } else {
                    _StdOut.putText("PID " + args[0] + " not found. Please supply a valid PID.");
                }
            } else {
                _StdOut.putText("Usage: kill <PID>  Please supply a valid PID.");
            }
        }

        public shellClearMem(args) {
            Mmu.zeroMemory();
            _StdOut.putText("All memory partitions cleared.");
        }

    }
}
