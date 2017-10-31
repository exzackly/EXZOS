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
                    public pidIncrementor: number = 0) {
        }

        public getRunningProcesses(): Pcb[] {
            var PIDs = Object.keys(_Scheduler.residentList);
            return PIDs.map(x => this.residentList[x]);
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
            console.log(base);
            console.log(limit);
            this.residentList[pid] = new Pcb(pid, base, limit, priority);

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
            Mmu.terminateProcess(this.residentList[pid]);
            delete this.residentList[pid]; // Remove Pcb from resident list
            Control.hostUpdateDisplay(); // Update display
        }

        public loadProcessOnCPU(pid: number): boolean {
            if (pid in this.residentList) {
                _CPU.loadProcess(this.residentList[pid]);
                Control.hostUpdateDisplay();
               return true;
            }
            return false;
        }


    }
}
