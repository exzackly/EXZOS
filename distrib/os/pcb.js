///<reference path="scheduler.ts" />
/* ------------
     pcb.ts

     Defines a data structure for a Process Control Block, which
     is used to hold the information relevant for a process
     ------------ */
var TSOS;
(function (TSOS) {
    class Pcb {
        constructor(pid, segment, priority, PC = 0, Acc = 0, Xreg = 0, Yreg = 0, Zflag = 0, isExecuting = false) {
            this.pid = pid;
            this.segment = segment;
            this.priority = priority;
            this.PC = PC;
            this.Acc = Acc;
            this.Xreg = Xreg;
            this.Yreg = Yreg;
            this.Zflag = Zflag;
            this.isExecuting = isExecuting;
        }
    }
    TSOS.Pcb = Pcb;
})(TSOS || (TSOS = {}));
