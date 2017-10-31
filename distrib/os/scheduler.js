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
        constructor(residentList = [], readyQueue = []) {
            this.residentList = residentList;
            this.readyQueue = readyQueue;
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
