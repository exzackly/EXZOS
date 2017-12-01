///<reference path="../globals.ts" />

/* ------------
     scheduler.ts

     Requires global.ts
              cpu.ts
              pcb.ts
              mmu.ts

     Defines a Scheduler, which is used to keep track of processes and schedule processes on the CPU
     ------------ */

module TSOS {

    export enum SchedulingType {
        roundRobin = "Round robin",
        firstComeFirstServe = "First come first serve",
        priority = "Priority"
    }

    export class Scheduler {

        constructor(public residentList: Pcb[] = [],
                    public readyQueue: number[] = [], // ready queue contains PID values; PCBs stored in resident list
                    public schedulingType: SchedulingType = SchedulingType.roundRobin,
                    public quantum: number = _SchedulerQuantum) {
        }

        public sortResidentList(): void {
            if (this.schedulingType === SchedulingType.priority) { // Sort by priority if scheduling algorithm
                this.residentList.sort((x, y) => x.priority - y.priority);
            } else { // Sort by pid otherwise
                this.residentList.sort((x, y) => x.pid - y.pid);
            }
        }

        public terminateProcess(pid: number): void {
            if (_CPU.pid === pid) { // Remove process from CPU if running specified process
                _CPU.terminateProcess();
            }
            Mmu.terminateProcess(this.getProcessForPid(pid));
            this.removeProcess(pid); // Remove process from resident list and ready queue
            if (this.readyQueue.length > 0) { // Load next running process if there is one
                this.loadFirstProcessInReadyQueue();
            }
            Control.hostUpdateDisplay(); // Update display
        }

        public loadProcessOnCPU(pid: number): number {
            var process = this.getProcessForPid(pid);
            if (process === null) {
                return -1; // Return value -1 indicates process not found
            } else if (this.readyQueue.length > 0) {
                return -2; // Return value -2 indicates processes already running
            } else {
                this.readyQueue.push(process.pid);
                this.loadFirstProcessInReadyQueue();
                return 0;
            }
        }

        public cpuDidCycle(): void {
            this.quantum--;
            if (this.quantum === 0) {
                if (this.readyQueue.length > 1) { // Another program exists; context switch
                    _KernelInterruptQueue.enqueue(new Interrupt(CONTEXT_SWITCH_IRQ, null));
                } else {
                    this.quantum = _SchedulerQuantum; // Reset quantum
                }
            }
        }

        public setSchedule(type: SchedulingType): void {
            this.schedulingType = type;
            if (type === SchedulingType.roundRobin) {
                _SchedulerQuantum = 6; // Reset to default quantum
            } else if (type === SchedulingType.firstComeFirstServe || type === SchedulingType.priority) {
                _SchedulerQuantum = Number.MAX_SAFE_INTEGER;
            }
            this.sortResidentList(); // Resort resident list based on new scheduling type
            Control.hostUpdateDisplayProcesses();
        }

        public updateStatistics(): void {
            for (var i = 0; i < this.readyQueue.length; i++) {
                var process = this.getProcessForPid(this.readyQueue[i]);
                if (i === 0) { // First item in ready queue is being executed
                    process.executeCycles++;
                } else { // All others are waiting
                    process.waitCycles++;
                }
            }
        }

        public executeNextInReadyQueue(): number {
            if (this.readyQueue.length > 1) { // Need something to switch to
                var oldProcessPID = this.readyQueue.shift(); // Remove and stash first element
                var oldProcess = this.getProcessForPid(oldProcessPID);
                _CPU.storeProcess(oldProcess); // Store state of process
                this.readyQueue.push(oldProcessPID); // Send process to end of ready queue
                return this.loadFirstProcessInReadyQueue();
            }
        }

        public loadFirstProcessInReadyQueue(): number {
            this.quantum = _SchedulerQuantum; // Reset quantum
            if (this.readyQueue.length > 0) {
                var process = this.getProcessForPid(this.readyQueue[0]); // Get process for first element in ready queue
                if (process.base == -1 || process.limit == -1) { // Process on disk. Need to roll in
                    if (_CPU.isExecuting === true && this.readyQueue.length > MEMORY_SEGMENT_COUNT) { // Check if need to roll out
                        var lastPIDInReadyQueue = this.readyQueue[this.readyQueue.length-1]; // Roll out last process in ready queue
                        Mmu.rollOutProcessToDisk(lastPIDInReadyQueue);
                    }
                    Mmu.rollInProcessFromDisk(this.readyQueue[0]); // Roll in process to be run
                }
                _CPU.loadProcess(process); // Load process onto CPU
                Control.hostUpdateDisplay();
                return process.pid;
            }
        }

        public runAll(): number {
            if (this.residentList.length === 0) { return -1; } // Return value -1 indicates nothing to run
            else if (this.readyQueue.length > 0) { return -2; } // Return value -2 indicates processes already running
            for (var i = 0; i < this.residentList.length; i++) {
                this.readyQueue.push(this.residentList[i].pid);
            }
            this.loadFirstProcessInReadyQueue();
            return 0;
        }

        public getProcessForPid(pid: number): Pcb {
            for (var i = 0; i < this.residentList.length; i++) {
                if (this.residentList[i].pid === pid) {
                    return this.residentList[i];
                }
            }
            return null;
        }

        public removeProcess(pid: number): void {
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
}
