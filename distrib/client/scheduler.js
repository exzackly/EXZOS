///<reference path="../globals.ts" />
/* ------------
     scheduler.ts

     Requires global.ts
              cpu.ts
              pcb.ts
              mmu.ts

     Defines a Scheduler, which is used to keep track of processes and schedule processes on the CPU
     ------------ */
var TSOS;
(function (TSOS) {
    var Scheduler = (function () {
        function Scheduler(residentList, pidIncrementor, segmentStatus) {
            if (residentList === void 0) { residentList = {}; }
            if (pidIncrementor === void 0) { pidIncrementor = 0; }
            if (segmentStatus === void 0) { segmentStatus = Array(SEGMENT_COUNT); }
            this.residentList = residentList;
            this.pidIncrementor = pidIncrementor;
            this.segmentStatus = segmentStatus;
            for (var i = 0; i < segmentStatus.length; i++) {
                segmentStatus[i] = false; // Initialize segments with unused (false) state
            }
        }
        Scheduler.prototype.loadNewProcess = function (prog) {
            // Create PCB for new process
            var segment = this.determineSegment(); // Segment determined first to ensure sufficient space before incrementing pidIncrementor
            if (segment === -1) {
                //todo: load to memory in project 4
                return -2; // Return value of -2 denotes insufficient memory
            }
            var pid = this.pidIncrementor;
            this.pidIncrementor += 1; // Increment for next process
            var priority = 0;
            //todo: support variable priority in project 3
            this.residentList[pid] = new TSOS.Pcb(pid, segment, priority);
            // Load program into memory
            var progArray = prog.match(/.{2}/g); // Break program into array of length 2 hex codes
            var program = progArray.map(function (x) { return TSOS.Utils.fromHex(x); }); // Convert program from hex to decimal
            TSOS.Mmu.zeroBytesInSegment(segment); // Zero memory segment
            TSOS.Mmu.setBytesAtLogicalAddress(segment, 0, program); // Load program into memory segment
            _CPU.updateDisplay(); // Update display
            return pid;
        };
        Scheduler.prototype.terminateProcess = function (pid) {
            _CPU.pid = -1;
            var segment = this.residentList[pid].segment;
            this.segmentStatus[segment] = false; // Clear up segment for reuse
            delete this.residentList[pid]; // Remove Pcb from resident list
            TSOS.Mmu.zeroBytesInSegment(segment); // Remove program from memory
            _CPU.updateDisplay(); // Update display
        };
        Scheduler.prototype.loadProcessOnCPU = function (pid) {
            if (pid in this.residentList) {
                _CPU.loadProcess(this.residentList[pid]);
                return true;
            }
            return false;
        };
        Scheduler.prototype.determineSegment = function () {
            // Find first empty segment (where index of segment status === false)
            for (var i = 0; i < this.segmentStatus.length; i++) {
                if (this.segmentStatus[i] === false) {
                    this.segmentStatus[i] = true;
                    return i;
                }
            }
            return -1; // Empty segment not found
        };
        return Scheduler;
    }());
    TSOS.Scheduler = Scheduler;
})(TSOS || (TSOS = {}));
