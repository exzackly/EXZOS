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
            quantum = _SchedulerQuantum) {
            this.residentList = residentList;
            this.readyQueue = readyQueue;
            this.quantum = quantum;
        }
        terminateProcess(pid) {
            if (_CPU.pid === pid) {
                _CPU.terminateProcess();
            }
            TSOS.Mmu.terminateProcess(this.getProcessForPid(pid));
            this.removeProcess(pid); // Remove process from resident list and ready queue
            if (this.readyQueue.length > 0) {
                this.loadFirstProcessInReadyQueue();
            }
            TSOS.Control.hostUpdateDisplay(); // Update display
        }
        loadProcessOnCPU(pid) {
            var process = this.getProcessForPid(pid);
            if (process === null) {
                return -1; // Return value -1 indicates process not found
            }
            else if (this.readyQueue.length > 0) {
                return -2; // Return value -2 indicates processes already running
            }
            else {
                this.readyQueue.push(process.pid);
                this.loadFirstProcessInReadyQueue();
                return 0;
            }
        }
        cpuDidCycle() {
            this.quantum--;
            if (this.quantum === 0) {
                if (this.readyQueue.length > 1) {
                    _KernelInterruptQueue.enqueue(new TSOS.Interrupt(CONTEXT_SWITCH_IRQ, null));
                }
                else {
                    this.quantum = _SchedulerQuantum; // Reset quantum
                }
            }
        }
        updateStatistics() {
            for (var i = 0; i < this.readyQueue.length; i++) {
                var process = this.getProcessForPid(this.readyQueue[i]);
                if (i === 0) {
                    process.executeCycles++;
                }
                else {
                    process.waitCycles++;
                }
            }
        }
        executeNextInReadyQueue() {
            if (this.readyQueue.length > 1) {
                var oldProcessPID = this.readyQueue.shift(); // Remove and stash first element
                var oldProcess = this.getProcessForPid(oldProcessPID);
                _CPU.storeProcess(oldProcess); // Store state of process
                this.readyQueue.push(oldProcessPID); // Send process to end of ready queue
                return this.loadFirstProcessInReadyQueue();
            }
        }
        loadFirstProcessInReadyQueue() {
            this.quantum = _SchedulerQuantum; // Reset quantum
            if (this.readyQueue.length > 0) {
                var process = this.getProcessForPid(this.readyQueue[0]); // Get process for first element in ready queue
                if (process.base == -1 || process.limit == -1) {
                    if (_CPU.isExecuting === true && this.readyQueue.length > MEMORY_SEGMENT_COUNT) {
                        var lastPIDInReadyQueue = this.readyQueue[this.readyQueue.length - 1]; // Roll out last process in ready queue
                        TSOS.Mmu.rollOutProcessToDisk(lastPIDInReadyQueue);
                    }
                    TSOS.Mmu.rollInProcessFromDisk(this.readyQueue[0]); // Roll in process to be run
                }
                _CPU.loadProcess(process); // Load process onto CPU
                TSOS.Control.hostUpdateDisplay();
                return process.pid;
            }
        }
        runAll() {
            if (this.residentList.length === 0) {
                return -1;
            } // Return value -1 indicates nothing to run
            else if (this.readyQueue.length > 0) {
                return -2;
            } // Return value -2 indicates processes already running
            for (var i = 0; i < this.residentList.length; i++) {
                this.readyQueue.push(this.residentList[i].pid);
            }
            this.loadFirstProcessInReadyQueue();
            return 0;
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
