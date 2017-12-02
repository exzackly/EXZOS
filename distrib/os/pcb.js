///<reference path="scheduler.ts" />
/* ------------
     pcb.ts

     Defines a data structure for a Process Control Block, which
     is used to hold the information relevant for a process
     ------------ */
var TSOS;
(function (TSOS) {
    class Pcb {
        constructor(pid, base, limit, priority, PC = 0, IR = -1, Acc = 0, Xreg = 0, Yreg = 0, Zflag = 0, waitCycles = 0, executeCycles = 0) {
            this.pid = pid;
            this.base = base;
            this.limit = limit;
            this.priority = priority;
            this.PC = PC;
            this.IR = IR;
            this.Acc = Acc;
            this.Xreg = Xreg;
            this.Yreg = Yreg;
            this.Zflag = Zflag;
            this.waitCycles = waitCycles;
            this.executeCycles = executeCycles;
        }
    }
    TSOS.Pcb = Pcb;
})(TSOS || (TSOS = {}));
