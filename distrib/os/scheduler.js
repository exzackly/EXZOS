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
    let SchedulingType;
    (function (SchedulingType) {
        SchedulingType["roundRobin"] = "Round robin";
        SchedulingType["firstComeFirstServe"] = "First come first serve";
        SchedulingType["priority"] = "Priority";
    })(SchedulingType = TSOS.SchedulingType || (TSOS.SchedulingType = {}));
    class Scheduler {
        constructor(residentList = [], readyQueue = new TSOS.Queue(), // ready queue contains PID values; PCBs stored in resident list
            schedulingType = SchedulingType.roundRobin, quantum = _SchedulerQuantum) {
            this.residentList = residentList;
            this.readyQueue = readyQueue;
            this.schedulingType = schedulingType;
            this.quantum = quantum;
        }
        sortResidentList() {
            if (this.schedulingType === SchedulingType.priority) {
                this.residentList.sort((x, y) => x.priority - y.priority);
            }
            else {
                this.residentList.sort((x, y) => x.pid - y.pid);
            }
        }
        terminateProcess(pid) {
            if (_CPU.pid === pid) {
                _CPU.terminateProcess();
            }
            TSOS.Mmu.terminateProcess(this.getProcessForPid(pid));
            this.removeProcess(pid); // Remove process from resident list and ready queue
            if (!this.readyQueue.isEmpty()) {
                this.loadFirstProcessInReadyQueue();
            }
            TSOS.Control.hostUpdateDisplay(); // Update display
        }
        loadProcessOnCPU(pid) {
            var process = this.getProcessForPid(pid);
            if (process === null) {
                return -1; // Return value -1 indicates process not found
            }
            else if (!this.readyQueue.isEmpty()) {
                return -2; // Return value -2 indicates processes already running
            }
            else {
                this.readyQueue.enqueue(process.pid);
                this.loadFirstProcessInReadyQueue();
                return 0;
            }
        }
        cpuDidCycle() {
            this.quantum--;
            if (this.quantum === 0) {
                if (this.readyQueue.getSize() > 1) {
                    _KernelInterruptQueue.enqueue(new TSOS.Interrupt(CONTEXT_SWITCH_IRQ, null));
                }
                else {
                    this.quantum = _SchedulerQuantum; // Reset quantum
                }
            }
        }
        setSchedule(type) {
            this.schedulingType = type;
            if (type === SchedulingType.roundRobin) {
                _SchedulerQuantum = 6; // Reset to default quantum
            }
            else if (type === SchedulingType.firstComeFirstServe || type === SchedulingType.priority) {
                _SchedulerQuantum = Number.MAX_SAFE_INTEGER;
            }
            this.sortResidentList(); // Resort resident list based on new scheduling type
            TSOS.Control.hostUpdateDisplayProcesses();
        }
        updateStatistics() {
            for (var i = 0; i < this.readyQueue.getSize(); i++) {
                var process = this.getProcessForPid(this.readyQueue.q[i]);
                if (i === 0) {
                    process.executeCycles++;
                }
                else {
                    process.waitCycles++;
                }
            }
        }
        executeNextInReadyQueue() {
            if (this.readyQueue.getSize() > 1) {
                var oldProcessPID = this.readyQueue.dequeue(); // Remove and stash first element
                var oldProcess = this.getProcessForPid(oldProcessPID);
                _CPU.storeProcess(oldProcess); // Store state of process
                this.readyQueue.enqueue(oldProcessPID); // Send process to end of ready queue
                return this.loadFirstProcessInReadyQueue();
            }
        }
        loadFirstProcessInReadyQueue() {
            this.quantum = _SchedulerQuantum; // Reset quantum
            if (!this.readyQueue.isEmpty()) {
                var process = this.getProcessForPid(this.readyQueue.peek()); // Get process for first element in ready queue
                if (process.base == -1 || process.limit == -1) {
                    if (_CPU.pid !== -1 && this.readyQueue.getSize() > MEMORY_SEGMENT_COUNT) {
                        var lastPIDInReadyQueue = this.readyQueue.q[this.readyQueue.getSize() - 1]; // Roll out last process in ready queue
                        TSOS.Mmu.rollOutProcessToDisk(lastPIDInReadyQueue);
                    }
                    TSOS.Mmu.rollInProcessFromDisk(this.readyQueue.peek()); // Roll in process to be run
                }
                _CPU.loadProcess(process); // Load process onto CPU
                TSOS.Control.hostUpdateDisplay();
                return process.pid;
            }
        }
        runAll() {
            if (this.residentList.length === 0) {
                return -1; // Return value -1 indicates nothing to run
            }
            else if (!this.readyQueue.isEmpty()) {
                return -2; // Return value -2 indicates processes already running
            }
            for (var i = 0; i < this.residentList.length; i++) {
                this.readyQueue.enqueue(this.residentList[i].pid);
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
            for (var i = 0; i < this.readyQueue.getSize(); i++) {
                if (this.readyQueue.q[i] === pid) {
                    this.readyQueue.q.splice(i, 1);
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
