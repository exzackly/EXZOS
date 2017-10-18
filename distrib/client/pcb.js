///<reference path="scheduler.ts" />
/* ------------
     pcb.ts

     Defines a data structure for a Process Control Block, which
     is used to hold the information relevant for a process
     ------------ */
var TSOS;
(function (TSOS) {
    var Pcb = (function () {
        function Pcb(pid, segment, priority, PC, Acc, Xreg, Yreg, Zflag, isExecuting) {
            if (PC === void 0) { PC = 0; }
            if (Acc === void 0) { Acc = 0; }
            if (Xreg === void 0) { Xreg = 0; }
            if (Yreg === void 0) { Yreg = 0; }
            if (Zflag === void 0) { Zflag = 0; }
            if (isExecuting === void 0) { isExecuting = false; }
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
        return Pcb;
    }());
    TSOS.Pcb = Pcb;
})(TSOS || (TSOS = {}));
