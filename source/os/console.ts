///<reference path="../globals.ts" />

/* ------------
     Console.ts

     Requires globals.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */

module TSOS {

    export class Console {

        constructor(public currentFont = _DefaultFontFamily,
                    public currentFontSize = _DefaultFontSize,
                    public currentXPosition = 0,
                    public currentYPosition = _DefaultFontSize,
                    public commandHistoryIndex = 0,
                    public commandHistory = [],
                    public buffer = "") {
        }

        public init(): void {
            this.clearScreen();
            this.resetXY();
        }

        private clearScreen(): void {
            _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
        }

        private resetXY(): void {
            this.currentXPosition = 0;
            this.currentYPosition = this.currentFontSize;
        }

        public handleInput(): void {
            while (_KernelInputQueue.getSize() > 0) {
                // Get the next character from the kernel input queue.
                var chr = _KernelInputQueue.dequeue();
                // Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
                if (chr === "&uarr;" || chr === "&darr;") { // up arrow or down arrow pressed
                   this.putCommandHistory(chr);
                } else if (chr === "&tab;") { // tab
                    this.tabCompleteCommand(this.buffer);
                } else if (chr === String.fromCharCode(8)) { //     Backspace key
                    this.backspaceCharacter();
                } else if (chr === String.fromCharCode(13)) { //     Enter key
                    // The enter key marks the end of a console command, so ...
                    // ... check if buffer has input ...
                    if (this.buffer.length == 0) { // buffer is empty; advance line and do not process command
                        this.advanceLine();
                        _OsShell.putPrompt();
                        return;
                    }
                    // ... store the command in the commandHistory and adjust commandHistory Index ...
                    this.commandHistory[this.commandHistory.length] = this.buffer;
                    this.commandHistoryIndex = this.commandHistory.length;
                    // ... tell the shell ...
                    _OsShell.handleInput(this.buffer);
                    // ... and reset our buffer.
                    this.buffer = "";
                } else {
                    // This is a "normal" character, so ...
                    // ... draw it on the screen...
                    this.putText(chr);
                    // ... and add it to our buffer.
                    this.buffer += chr;
                }
                // TODO: Write a case for Ctrl-C.
            }
        }

        public putCommandHistory(chr): void {
             if (chr === "&uarr;" && this.commandHistoryIndex > 0) { // check that command history has previous command
                this.commandHistoryIndex -= 1;
            } else if (chr == "&darr;" && this.commandHistoryIndex < this.commandHistory.length-1) { // check that do not pass last command entered
                this.commandHistoryIndex += 1;
            } else { return; } // past bounds; return before erasing screen
            this.clearLine();
            this.buffer = this.commandHistory[this.commandHistoryIndex];
            this.putText(this.buffer);
        }

        public tabCompleteCommand(prefix): void {
            if (prefix.length === 0) { return; } // Do not autocomplete if buffer empty
            var commandsWithPrefix  = _OsShell.commandList.filter(function(cmd){
                 return cmd.command.startsWith(prefix); // return true is cmd(ShellCommand obj)'s command has prefix
            });
            if (commandsWithPrefix.length == 1) { // Only 1 possible command with prefix; autocomplete
                var cmd = commandsWithPrefix[0].command;
                this.clearLine();
                this.putText(cmd);
                this.buffer = cmd;
            } else if (commandsWithPrefix.length > 1) { // Multiple possible commands with prefix; display all
                // Grab corresponding command names, and join with a space
                var commandNames = commandsWithPrefix.map(function(cmd){ return cmd.command; }).join(" ");
                // Display all possible commands with prefix
                this.advanceLine();
                this.putText(commandNames);
                this.advanceLine();
                // Prepare for next input; restore buffer
                _OsShell.putPrompt();
                this.putText(this.buffer);
            }
        }

        public backspaceCharacter(): void {
            var lastChr = this.buffer.slice(-1); // Get last character in buffer (character to backspace)
            // Calculate width to clear
            var backspaceWidth = _DrawingContext.measureText(this.currentFont, this.currentFontSize, lastChr);
            this.currentXPosition -= backspaceWidth; // Move cursor position
            // Clear rect with character to delete
            _DrawingContext.clearRect(this.currentXPosition, this.currentYPosition - _DefaultFontSize, backspaceWidth, this.consoleLineHeight());
            // Remove character from buffer
            this.buffer = this.buffer.slice(0, -1);
        }

        public clearLine(): void {
            this.currentXPosition = 0;
            _DrawingContext.clearRect(this.currentXPosition, this.currentYPosition - _DefaultFontSize, _Canvas.width, this.consoleLineHeight());
            _StdOut.putText(_OsShell.promptStr);
        }

        public putText(text): void {
            // My first inclination here was to write two functions: putChar() and putString().
            // Then I remembered that JavaScript is (sadly) untyped and it won't differentiate
            // between the two.  So rather than be like PHP and write two (or more) functions that
            // do the same thing, thereby encouraging confusion and decreasing readability, I
            // decided to write one function and use the term "text" to connote string or char.
            //
            // UPDATE: Even though we are now working in TypeScript, char and string remain undistinguished.
            //         Consider fixing that.
            if (text !== "") {
                // Draw the text at the current X and Y coordinates.
                _DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, text);
                // Move the current X position.
                var offset = _DrawingContext.measureText(this.currentFont, this.currentFontSize, text);
                this.currentXPosition = this.currentXPosition + offset;
            }
         }

        public advanceLine(): void {
            this.currentXPosition = 0;
            this.currentYPosition += this.consoleLineHeight();
            // Scroll if cursor at bottom of screen
			if (this.currentYPosition >= _Canvas.height) {
				var scrollYBy = (this.currentYPosition-_Canvas.height)+_FontHeightMargin;
				var screenshot = _DrawingContext.getImageData(0, 0, _Canvas.width, _Canvas.height);
				this.clearScreen();
				this.currentYPosition -= scrollYBy;
				_DrawingContext.putImageData(screenshot, 0, -scrollYBy);
			}
        }

        public consoleLineHeight(): number {
			/*
             * Font size measures from the baseline to the highest point in the font.
             * Font descent measures from the baseline to the lowest point in the font.
             * Font height margin is extra spacing between the lines.
             */
            return _DefaultFontSize +
                   _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
                   _FontHeightMargin;
		}
    }
 }
