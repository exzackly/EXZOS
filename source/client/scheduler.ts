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

        constructor(public residentList: {[pid: number]: Pcb;} = {},
                    public pidIncrementor: number = 0,
                    public segmentStatus: boolean[] = Array(SEGMENT_COUNT)) {
            segmentStatus.fill(false); // Initialize segments with unused (false) state
        }

        public getRunningProcesses(): Pcb[] {
            var PIDs = Object.keys(_Scheduler.residentList);
            return PIDs.map(x => this.residentList[x]);
        }

        public loadNewProcess(prog: string): number {
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
            this.residentList[pid] = new Pcb(pid, segment, priority);

            // Load program into memory
            var progArray = prog.match(/.{2}/g); // Break program into array of length 2 hex codes
            var program = progArray.map(x => Utils.fromHex(x)); // Convert program from hex to decimal

            Mmu.zeroBytesInSegment(segment); // Zero memory segment
            Mmu.setBytesAtLogicalAddress(segment,0, program); // Load program into memory segment

            Control.hostUpdateDisplay(); // Update display

            return pid;
        }

        public terminateProcess(pid: number): void {
            _CPU.pid = -1;
            var segment = this.residentList[pid].segment;
            this.segmentStatus[segment] = false; // Clear up segment for reuse
            delete this.residentList[pid]; // Remove Pcb from resident list
            Mmu.zeroBytesInSegment(segment); // Remove program from memory
            Control.hostUpdateDisplay(); // Update display
        }

        public loadProcessOnCPU(pid: number): boolean {
            if (pid in this.residentList) {
                _CPU.loadProcess(this.residentList[pid]);
               return true;
            }
            return false;
        }

        public determineSegment(): number {
            // Find first empty segment (where index of segment status === false)
            for (var i = 0; i < this.segmentStatus.length; i++) {
                if (this.segmentStatus[i] === false) {
                    this.segmentStatus[i] = true;
                    return i;
                }
            }
            return -1; // Empty segment not found
        }

    }
}
