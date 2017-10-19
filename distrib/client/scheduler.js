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
    class Scheduler {
        constructor(residentList = {}, pidIncrementor = 0) {
            this.residentList = residentList;
            this.pidIncrementor = pidIncrementor;
        }
        getRunningProcesses() {
            var PIDs = Object.keys(_Scheduler.residentList);
            return PIDs.map(x => this.residentList[x]);
        }
        loadNewProcess(prog) {
            // Create PCB for new process
            var segment = TSOS.Mmu.determineSegment(); // Segment determined first to ensure sufficient space before incrementing pidIncrementor
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
            var program = progArray.map(x => TSOS.Utils.fromHex(x)); // Convert program from hex to decimal
            TSOS.Mmu.zeroBytesInSegment(segment); // Zero memory segment
            TSOS.Mmu.setBytesAtLogicalAddress(segment, 0, program); // Load program into memory segment
            TSOS.Control.hostUpdateDisplay(); // Update display
            return pid;
        }
        terminateProcess(pid) {
            _CPU.pid = -1;
            var segment = this.residentList[pid].segment;
            TSOS.Mmu.segmentStatus[segment] = false; // Clear up segment for reuse
            delete this.residentList[pid]; // Remove Pcb from resident list
            TSOS.Mmu.zeroBytesInSegment(segment); // Remove program from memory
            TSOS.Control.hostUpdateDisplay(); // Update display
        }
        loadProcessOnCPU(pid) {
            if (pid in this.residentList) {
                _CPU.loadProcess(this.residentList[pid]);
                return true;
            }
            return false;
        }
    }
    TSOS.Scheduler = Scheduler;
})(TSOS || (TSOS = {}));
