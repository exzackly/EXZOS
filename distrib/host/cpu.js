///<reference path="../globals.ts" />
/* ------------
     CPU.ts

     Requires global.ts.

     Routines for the host CPU simulation, NOT for the OS itself.
     In this manner, it's A LITTLE BIT like a hypervisor,
     in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
     that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
     TypeScript/JavaScript in both the host and client environments.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */
var TSOS;
(function (TSOS) {
    class Cpu {
        constructor(pid = -1, segment = -1, PC = 0, Acc = 0, Xreg = 0, Yreg = 0, Zflag = 0, isExecuting = false) {
            this.pid = pid;
            this.segment = segment;
            this.PC = PC;
            this.Acc = Acc;
            this.Xreg = Xreg;
            this.Yreg = Yreg;
            this.Zflag = Zflag;
            this.isExecuting = isExecuting;
            this.opCodeMap = {
                0xA9: { operandSize: 1, mnemonic: "LDA", fn: this.loadAccumulatorWithConstant },
                0xAD: { operandSize: 2, mnemonic: "LDA", fn: this.loadAccumulatorFromMemory },
                0x8D: { operandSize: 2, mnemonic: "STA", fn: this.storeAccumulatorInMemory },
                0x6D: { operandSize: 2, mnemonic: "ADC", fn: this.addWithCarry },
                0xA2: { operandSize: 1, mnemonic: "LDX", fn: this.loadXRegWithConstant },
                0xAE: { operandSize: 2, mnemonic: "LDX", fn: this.loadXRegFromMemory },
                0xA0: { operandSize: 1, mnemonic: "LDY", fn: this.loadYRegWithConstant },
                0xAC: { operandSize: 2, mnemonic: "LDY", fn: this.loadYRegFromMemory },
                0xEA: { operandSize: 0, mnemonic: "NOP", fn: this.noOperation },
                0x00: { operandSize: 0, mnemonic: "BRK", fn: this.brk },
                0xEC: { operandSize: 2, mnemonic: "CPX", fn: this.compareMemoryWithXReg },
                0xD0: { operandSize: 1, mnemonic: "BNE", fn: this.branchIfNotEqual },
                0xEE: { operandSize: 2, mnemonic: "INC", fn: this.incrementByte },
                0xFF: { operandSize: 0, mnemonic: "SYS", fn: this.systemCall } // System Call
            };
        }
        cycle() {
            _Kernel.krnTrace('CPU cycle');
            // TODO: Accumulate CPU usage and profiling statistics here.
            //fetch
            var opCodeByte = TSOS.Mmu.getByteAtLogicalAddress(this.segment, this.PC);
            this.PC += 1;
            //decode
            var opCode = this.opCodeMap[opCodeByte];
            if (opCode === undefined) {
                //todo: print error
                console.log("err" + opCodeByte);
            }
            //execute
            opCode.fn.call(this);
            //todo: comment
            this.PC += opCode.operandSize;
            this.updatePCB(_Scheduler.residentList[this.pid]);
            if (_SSMode === true) {
                this.isExecuting = false;
            }
            TSOS.Control.hostUpdateDisplay();
        }
        storeProcess(pcb) {
            return pcb;
        }
        loadProcess(pcb) {
            this.pid = pcb.pid;
            this.segment = pcb.segment;
            this.PC = pcb.PC;
            this.Acc = pcb.Acc;
            this.Xreg = pcb.Xreg;
            this.Yreg = pcb.Yreg;
            this.Zflag = pcb.Zflag;
            this.isExecuting = true;
            TSOS.Control.hostUpdateDisplay();
        }
        loadAccumulatorWithConstant() {
            /*
            A9 02 00 00
            Acc should be 02
             */
            this.Acc = TSOS.Mmu.getByteAtLogicalAddress(this.segment, this.PC);
        }
        loadAccumulatorFromMemory() {
            /*
            AD 05 00 00 00 03
            Acc should be 03
             */
            this.Acc = this.getBytesAtNextAddress(this.PC);
        }
        storeAccumulatorInMemory() {
            /*
            A9 04 8D 07 00 00 00 02
            0x07 should be 04
             */
            var loc = this.getNextAddress(this.PC);
            TSOS.Mmu.setByteAtLogicalAddress(this.segment, loc, this.Acc);
        }
        addWithCarry() {
            /*
            A9 FC 6D 07 00 00 00 07
            Acc should be 03
             */
            //todo: test carry portion
            this.Acc += this.getBytesAtNextAddress(this.PC);
        }
        loadXRegWithConstant() {
            /*
            A2 05 00 00
            Xreg should be 05
             */
            this.Xreg = TSOS.Mmu.getByteAtLogicalAddress(this.segment, this.PC);
        }
        loadXRegFromMemory() {
            /*
            AE 05 00 00 00 06
            Xreg should be 06
             */
            this.Xreg = this.getBytesAtNextAddress(this.PC);
        }
        loadYRegWithConstant() {
            /*
            A0 07 00 00
            Yreg should be 07
             */
            this.Yreg = TSOS.Mmu.getByteAtLogicalAddress(this.segment, this.PC);
        }
        loadYRegFromMemory() {
            /*
            AC 05 00 00 00 08
            Yreg should be 08
             */
            this.Yreg = this.getBytesAtNextAddress(this.PC);
        }
        noOperation() {
            /*
            EA EA EA 00 00
            PC should be 04
             */
            return;
        }
        brk() {
            this.isExecuting = false;
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(TERMINATE_PROGRAM_IRQ, this.pid));
        }
        compareMemoryWithXReg() {
            /*
            A2 07 EC 07 00 00 00 07
            Zflag should be 01
             */
            var memory = this.getBytesAtNextAddress(this.PC);
            this.Zflag = memory == this.Xreg ? 1 : 0;
        }
        branchIfNotEqual() {
            /*
            D0 02 A9 07 00 00
            Acc should be 00


             */
            if (this.Zflag === 0) {
                this.PC = (this.PC + TSOS.Mmu.getByteAtLogicalAddress(this.segment, this.PC)) % SEGMENT_SIZE;
            }
        }
        incrementByte() {
            /*
            EE 05 00 00 00 08
            0x05 should be 09
             */
            var loc = this.getNextAddress(this.PC);
            var value = this.getBytesAtNextAddress(this.PC);
            TSOS.Mmu.setByteAtLogicalAddress(this.segment, loc, value + 1);
        }
        systemCall() {
            /*
            A2 01 A0 0A FF 00 00
            Should print 10

            A2 02 A0 07 FF 00 00 45 58 5A 41 43 4B 4C 59 00
            Should print EXZACKLY
             */
            if (this.Xreg == 0x1) {
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(SYSCALL_IRQ, this.Yreg.toString()));
            }
            else if (this.Xreg == 0x2) {
                var memory = TSOS.Mmu.getBytesAtLogicalAddress(this.segment, this.Yreg, SEGMENT_SIZE - this.Yreg - 1);
                var output = "";
                for (var i = 0; i < memory.length; i++) {
                    if (memory[i] === 0x0) {
                        break;
                    }
                    output += String.fromCharCode(memory[i]);
                }
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(SYSCALL_IRQ, output));
            }
        }
        getNextAddress(location) {
            var address = TSOS.Mmu.getBytesAtLogicalAddress(this.segment, location, 2); // todo: Replace magic number?
            // Regarding Kernighan's law: just get it right the first time and you won't ever have to debug
            // If you can't inherently understand this just by looking at it, you really need to ask yourself if you belong here /s
            // Seriously though look up reduce, it can do a lot of cool shit
            return address.reduce((a, v, i) => a + (v * Math.pow(256, i))); // It's not a magic number, we're working in hex
        }
        getBytesAtNextAddress(location) {
            var address = this.getNextAddress(location);
            return TSOS.Mmu.getByteAtLogicalAddress(this.segment, address);
        }
        updatePCB(pcb) {
            pcb.PC = this.PC;
            pcb.Acc = this.Acc;
            pcb.Xreg = this.Xreg;
            pcb.Yreg = this.Yreg;
            pcb.Zflag = this.Zflag;
            pcb.isExecuting = this.isExecuting;
        }
    }
    TSOS.Cpu = Cpu;
})(TSOS || (TSOS = {}));
