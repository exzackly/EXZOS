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

    export class Scheduler {

        constructor(public residentList: Pcb[] = [],
                    public readyQueue: number[] = [], // ready queue contains PID values; PCBs stored in resident list
                    public pidIncrementor: number = 0) {
        }

        public loadNewProcess(prog: string): number {
            // Create PCB for new process
            var base = Mmu.determineBase(); // Segment determined first to ensure sufficient space before incrementing pidIncrementor
            if (base === -1) { // Empty segment not found
                //todo: load to memory in project 4
                return -2; // Return value of -2 denotes insufficient memory
            }
            var limit = base+SEGMENT_SIZE;
            var pid = this.pidIncrementor;
            this.pidIncrementor += 1; // Increment for next process
            var priority = 0;
            //todo: support variable priority in project 3
            this.residentList.push(new Pcb(pid, base, limit, priority));

            // Load program into memory
            var progArray = prog.match(/.{2}/g); // Break program into array of length 2 hex codes
            var program = progArray.map(x => Utils.fromHex(x)); // Convert program from hex to decimal

            Mmu.zeroBytesWithBaseandLimit(base, limit); // Zero memory
            Mmu.setBytesAtLogicalAddress(0, program, base, limit); // Load program into memory segment

            Control.hostUpdateDisplay(); // Update display

            return pid;
        }

        public terminateProcess(pid: number): void {
            _CPU.terminateProcess();
            Mmu.terminateProcess(this.getProcessForPid(pid));
            this.removeProcess(pid); // Remove process from resident list and ready queue
            Control.hostUpdateDisplay(); // Update display
        }

        public loadProcessOnCPU(pid: number): boolean {
            var process = this.getProcessForPid(pid);
            if (process !== null) {
                _CPU.loadProcess(process);
                Control.hostUpdateDisplay();
                return true;
            }
            return false;
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
