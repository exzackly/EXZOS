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
                    public readyQueue: number[] = []) { // ready queue contains PID values; PCBs stored in resident list
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
