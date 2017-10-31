///<reference path="scheduler.ts" />

/* ------------
     pcb.ts

     Defines a data structure for a Process Control Block, which
     is used to hold the information relevant for a process
     ------------ */

module TSOS {

    export class Pcb {

        constructor(public pid: number,
                    public base: number,
                    public limit: number,
                    public priority: number,
                    public PC: number = 0,
                    public Acc: number = 0,
                    public Xreg: number = 0,
                    public Yreg: number = 0,
                    public Zflag: number = 0,
                    public isExecuting: boolean = false) {
        }

    }
}
