///<reference path="../globals.ts" />
/* ------------
     Console.ts

     Requires globals.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */
var TSOS;
(function (TSOS) {
    class Console {
        constructor(currentFont = _DefaultFontFamily, currentFontSize = _DefaultFontSize, currentXPosition = 0, currentYPosition = _DefaultFontSize, commandHistoryIndex = 0, commandHistory = [], buffer = "") {
            this.currentFont = currentFont;
            this.currentFontSize = currentFontSize;
            this.currentXPosition = currentXPosition;
            this.currentYPosition = currentYPosition;
            this.commandHistoryIndex = commandHistoryIndex;
            this.commandHistory = commandHistory;
            this.buffer = buffer;
            this.clearScreen();
            this.resetXY();
        }
        clearScreen() {
            _Canvas.height = _CanvasDefaultHeight; // Reset canvas height
            _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
        }
        resetXY() {
            this.currentXPosition = 0;
            this.currentYPosition = this.currentFontSize;
        }
        handleInput() {
            while (_KernelInputQueue.getSize() > 0) {
                // Get the next character from the kernel input queue.
                var chr = _KernelInputQueue.dequeue();
                // Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
                if (chr === "&uarr;" || chr === "&darr;") {
                    this.putCommandHistory(chr);
                }
                else if (chr === "&tab;") {
                    this.tabCompleteCommand(this.buffer);
                }
                else if (chr === String.fromCharCode(8)) {
                    this.backspaceCharacter();
                }
                else if (chr === String.fromCharCode(13)) {
                    // The enter key marks the end of a console command, so ...
                    // ... check if buffer has input ...
                    if (this.buffer.length === 0) {
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
                }
                else if (chr == "&ctrl-r") {
                    TSOS.Control.hostBtnReset_click(null);
                }
                else {
                    // This is a "normal" character, so ...
                    // ... draw it on the screen...
                    this.putText(chr);
                    // ... and add it to our buffer.
                    this.buffer += chr;
                }
            }
        }
        putCommandHistory(chr) {
            if (chr === "&uarr;" && this.commandHistoryIndex > 0) {
                this.commandHistoryIndex -= 1;
            }
            else if (chr == "&darr;" && this.commandHistoryIndex < this.commandHistory.length - 1) {
                this.commandHistoryIndex += 1;
            }
            else {
                return;
            } // past bounds; return before erasing screen
            this.clearBuffer();
            this.buffer = this.commandHistory[this.commandHistoryIndex];
            this.putText(this.buffer);
        }
        tabCompleteCommand(prefix) {
            if (prefix.length === 0) {
                return;
            } // Do not autocomplete if buffer empty
            var commands = Object.keys(_OsShell.commandMap);
            var commandsWithPrefix = commands.filter(cmd => cmd.startsWith(prefix));
            if (commandsWithPrefix.length == 1) {
                var cmd = commandsWithPrefix[0];
                this.clearBuffer();
                this.putText(cmd);
                this.buffer = cmd;
            }
            else if (commandsWithPrefix.length > 1) {
                // Grab corresponding command names, and join with a space
                var commandNames = commandsWithPrefix.join(" ");
                // Display all possible commands with prefix
                this.advanceLine();
                this.putText(commandNames);
                this.advanceLine();
                // Prepare for next input; restore buffer
                _OsShell.putPrompt();
                this.putText(this.buffer);
            }
        }
        backspaceCharacter() {
            var lastChr = this.buffer.slice(-1); // Get last character in buffer (character to backspace)
            // Calculate width to clear
            var backspaceWidth = _DrawingContext.measureText(this.currentFont, this.currentFontSize, lastChr);
            this.currentXPosition -= backspaceWidth; // Move cursor position
            // Clear rect with character to delete
            _DrawingContext.clearRect(this.currentXPosition, this.currentYPosition - _DefaultFontSize, backspaceWidth, this.consoleLineHeight());
            this.buffer = this.buffer.slice(0, -1); // Remove character from buffer
            // Check if last character from line deleted, and snap back to last line if needed
            if (this.currentXPosition <= 0) {
                this.currentYPosition -= this.consoleLineHeight();
                // xPosition is used to compute where to place the cursor on the previous line
                var xPosition = _DrawingContext.measureText(this.currentFont, this.currentFontSize, _OsShell.promptStr + this.buffer);
                xPosition = xPosition % _Canvas.width; // If there are multiple lines worth of text in the buffer, calculate the width of the last line
                this.currentXPosition = xPosition;
            }
        }
        clearBuffer() {
            this.currentXPosition = 0;
            // Determine if buffer has line wrapped; clear all lines and adjust currentYPosition if needed
            var bufferSize = _DrawingContext.measureText(this.currentFont, this.currentFontSize, _OsShell.promptStr + this.buffer);
            var lineCount = Math.ceil(bufferSize / _Canvas.width);
            if (lineCount > 1) {
                this.currentYPosition -= (lineCount - 1) * this.consoleLineHeight(); // Subtract 1 because you want to stay on the first line
            }
            _DrawingContext.clearRect(this.currentXPosition, this.currentYPosition - _DefaultFontSize, _Canvas.width, lineCount * this.consoleLineHeight());
            _StdOut.putText(_OsShell.promptStr);
        }
        lineWrappedText(text) {
            var availableWidth = _Canvas.width - this.currentXPosition; // Calculate remaining space on the current line
            var buffer = "";
            var lineWrappedText = [];
            while (text.length > 0) {
                // Add character by character to buffer while width of buffer is smaller than the available width of canvas
                while (text.length > 0 &&
                    _DrawingContext.measureText(this.currentFont, this.currentFontSize, (buffer + text.charAt(0))) <= availableWidth) {
                    buffer += text.charAt(0);
                    text = text.slice(1);
                }
                lineWrappedText.push(buffer);
                buffer = "";
                availableWidth = _Canvas.width; // Subsequent lines have full-width of screen
            }
            return lineWrappedText;
        }
        putText(text) {
            if (text !== "") {
                var lineWrappedText = this.lineWrappedText(text);
                for (var i = 0; i < lineWrappedText.length; i++) {
                    var line = lineWrappedText[i];
                    // Draw the text at the current X and Y coordinates.
                    _DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, line);
                    // Move the current X position.
                    var offset = _DrawingContext.measureText(this.currentFont, this.currentFontSize, line);
                    this.currentXPosition = this.currentXPosition + offset;
                    if (i + 1 < lineWrappedText.length) {
                        this.advanceLine();
                    }
                }
            }
        }
        advanceLine() {
            this.currentXPosition = 0;
            this.currentYPosition += this.consoleLineHeight();
            // Scroll if cursor at bottom of screen
            if (this.currentYPosition >= _Canvas.height) {
                /*
                Alan approved method. Switching to an improved scrolling method,
                but left to demonstrate the correct way to scroll

                var scrollYBy = (this.currentYPosition-_Canvas.height)+_FontHeightMargin;
                var screenshot = _DrawingContext.getImageData(0, 0, _Canvas.width, _Canvas.height);
                this.clearScreen();
                this.currentYPosition -= scrollYBy;
                _DrawingContext.putImageData(screenshot, 0, -scrollYBy);
                */
                var screenshot = _DrawingContext.getImageData(0, 0, _Canvas.width, _Canvas.height);
                _Canvas.height += (this.currentYPosition - _Canvas.height) + _FontHeightMargin;
                _DrawingContext.putImageData(screenshot, 0, 0);
                TSOS.Control.hostScrollToBottomOfConsole();
            }
        }
        consoleLineHeight() {
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
    TSOS.Console = Console;
})(TSOS || (TSOS = {}));
