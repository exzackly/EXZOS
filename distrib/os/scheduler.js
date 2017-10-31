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
        constructor(residentList = [], readyQueue = [], // ready queue contains PID values; PCBs stored in resident list
            pidIncrementor = 0) {
            this.residentList = residentList;
            this.readyQueue = readyQueue;
            this.pidIncrementor = pidIncrementor;
        }
        loadNewProcess(prog) {
            // Create PCB for new process
            var base = TSOS.Mmu.determineBase(); // Segment determined first to ensure sufficient space before incrementing pidIncrementor
            if (base === -1) {
                //todo: load to memory in project 4
                return -2; // Return value of -2 denotes insufficient memory
            }
            var limit = base + SEGMENT_SIZE;
            var pid = this.pidIncrementor;
            this.pidIncrementor += 1; // Increment for next process
            var priority = 0;
            //todo: support variable priority in project 3
            this.residentList.push(new TSOS.Pcb(pid, base, limit, priority));
            // Load program into memory
            var progArray = prog.match(/.{2}/g); // Break program into array of length 2 hex codes
            var program = progArray.map(x => TSOS.Utils.fromHex(x)); // Convert program from hex to decimal
            TSOS.Mmu.zeroBytesWithBaseandLimit(base, limit); // Zero memory
            TSOS.Mmu.setBytesAtLogicalAddress(0, program, base, limit); // Load program into memory segment
            TSOS.Control.hostUpdateDisplay(); // Update display
            return pid;
        }
        terminateProcess(pid) {
            _CPU.terminateProcess();
            TSOS.Mmu.terminateProcess(this.getProcessForPid(pid));
            this.removeProcess(pid); // Remove process from resident list and ready queue
            TSOS.Control.hostUpdateDisplay(); // Update display
        }
        loadProcessOnCPU(pid) {
            var process = this.getProcessForPid(pid);
            if (process !== null) {
                _CPU.loadProcess(process);
                TSOS.Control.hostUpdateDisplay();
                return true;
            }
            return false;
        }
        getProcessForPid(pid) {
            for (var i = 0; i < this.residentList.length; i++) {
                if (this.residentList[i].pid === pid) {
                    return this.residentList[i];
                }
            }
            return null;
        }
        removeProcess(pid) {
            for (var i = 0; i < this.readyQueue.length; i++) {
                if (this.readyQueue[i] === pid) {
                    this.readyQueue.splice(i, 1);
                }
            }
            for (var i = 0; i < this.residentList.length; i++) {
                if (this.residentList[i].pid === pid) {
                    this.residentList.splice(i, 1);
                }
            }
        }
    }
    TSOS.Scheduler = Scheduler;
})(TSOS || (TSOS = {}));
