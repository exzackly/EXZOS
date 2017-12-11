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

module TSOS {

    export class Cpu {

        constructor(public pid: number = -1,
                    public base: number = -1,
                    public limit: number = -1,
                    public PC: number = 0,
                    public Acc: number = 0,
                    public IR: number = -1,
                    public Xreg: number = 0,
                    public Yreg: number = 0,
                    public Zflag: number = 0,
                    public isExecuting: boolean = false) {
        }

        public cycle(): void {
            _Kernel.krnTrace('CPU cycle');

            Control.hostRemoveHighlightFromMemoryCells();

            // Highlight op code operator
            var opCodeOperatorIndex = Mmu.getPhysicalAddress(this.PC, this.base);
            Control.hostHighlightMemoryCell(opCodeOperatorIndex, 1, true);

            // Fetch
            var opCodeByte = Mmu.getByteAtLogicalAddress(this.PC, this.base, this.limit);
            this.IR = opCodeByte;
            this.PC += 1;

            // Decode
            var opCode = this.opCodeMap[opCodeByte];
            if (opCode === undefined) {
                _KernelInterruptQueue.enqueue(new Interrupt(INVALID_OPCODE_IRQ, this.pid));
                return;
            }

            // Highlight op code operand
            for (var i = 0; i < opCode.operandSize; i++) { // Operands are variable length; grab all
                var opCodeOperandIndex = Mmu.getPhysicalAddress(this.PC+i, this.base);
                Control.hostHighlightMemoryCell(opCodeOperandIndex, 2);
            }

            // Update wait cycles and turnaround cycles
            _Scheduler.updateStatistics();

            // Execute
            opCode.fn.call(this);
            this.PC += opCode.operandSize;

            // Update PCB, stop execution if single step mode, inform scheduler of cycle, and update display
            this.storeProcess(this.currentProcess());
            if (_SSMode === true) {
                this.isExecuting = false;
            }
            _Scheduler.cpuDidCycle();
            Control.hostUpdateDisplay();
        }

        public storeProcess(pcb: Pcb): void {
            // pid, base, and limit will not change
            pcb.PC = this.PC;
            pcb.Acc = this.Acc;
            pcb.IR = this.IR;
            pcb.Xreg = this.Xreg;
            pcb.Yreg = this.Yreg;
            pcb.Zflag = this.Zflag;
        }

        public loadProcess(pcb: Pcb): void {
            this.pid = pcb.pid;
            this.base = pcb.base;
            this.limit = pcb.limit;
            this.PC = pcb.PC;
            this.Acc = pcb.Acc;
            this.IR = pcb.IR;
            this.Xreg = pcb.Xreg;
            this.Yreg = pcb.Yreg;
            this.Zflag = pcb.Zflag;
            this.isExecuting = true;
        }

        public terminateProcess(): void {
            this.isExecuting = false;
            this.pid = -1;
        }

        public currentProcess(): Pcb {
            return _Scheduler.getProcessForPid(this.pid);
        }

        public opCodeMap = {
            0xA9: {operandSize: 1, mnemonic: "LDA", fn: this.loadAccumulatorWithConstant}, // Load the accumulator with a constant
            0xAD: {operandSize: 2, mnemonic: "LDA", fn: this.loadAccumulatorFromMemory},   // Load the accumulator from memory
            0x8D: {operandSize: 2, mnemonic: "STA", fn: this.storeAccumulatorInMemory},    // Store the accumulator in memory
            0x6D: {operandSize: 2, mnemonic: "ADC", fn: this.addWithCarry},                // Add with carry
            0xA2: {operandSize: 1, mnemonic: "LDX", fn: this.loadXRegWithConstant},        // Load the X register with a constant
            0xAE: {operandSize: 2, mnemonic: "LDX", fn: this.loadXRegFromMemory},          // Load the X register from memory
            0xA0: {operandSize: 1, mnemonic: "LDY", fn: this.loadYRegWithConstant},        // Load the Y register with a constant
            0xAC: {operandSize: 2, mnemonic: "LDY", fn: this.loadYRegFromMemory},          // Load the Y register from memory
            0xEA: {operandSize: 0, mnemonic: "NOP", fn: this.noOperation},                 // No Operation
            0x00: {operandSize: 0, mnemonic: "BRK", fn: this.brk},                         // Break
            0xEC: {operandSize: 2, mnemonic: "CPX", fn: this.compareMemoryWithXReg},       // Compare a byte in memory to the X reg
            0xD0: {operandSize: 1, mnemonic: "BNE", fn: this.branchIfNotEqual},            // Branch n bytes if Z flag = 0
            0xEE: {operandSize: 2, mnemonic: "INC", fn: this.incrementByte},               // Increment the value of a byte
            0xFF: {operandSize: 0, mnemonic: "SYS", fn: this.systemCall}                   // System Call
        };

        public loadAccumulatorWithConstant(): void {
            /*
            A9 02 00 00
            Acc should be 02
             */
            this.Acc = Mmu.getByteAtLogicalAddress(this.PC, this.base, this.limit);
        }

        public loadAccumulatorFromMemory(): void {
            /*
            AD 05 00 00 00 03
            Acc should be 03
             */
            this.Acc = this.getBytesAtNextAddress(this.PC);
        }

        public storeAccumulatorInMemory(): void {
            /*
            A9 04 8D 07 00 00 00 02
            0x07 should be 04
             */
            var loc = this.getNextAddress(this.PC);
            Mmu.setByteAtLogicalAddress(loc, this.Acc, this.base, this.limit);
        }

        public addWithCarry(): void {
            /*
            A9 FC 6D 07 00 00 00 07
            Acc should be 03
             */
            this.Acc += this.getBytesAtNextAddress(this.PC);
        }

        public loadXRegWithConstant(): void {
            /*
            A2 05 00 00
            Xreg should be 05
             */
            this.Xreg = Mmu.getByteAtLogicalAddress(this.PC, this.base, this.limit);
        }

        public loadXRegFromMemory(): void {
            /*
            AE 05 00 00 00 06
            Xreg should be 06
             */
            this.Xreg = this.getBytesAtNextAddress(this.PC);
        }

        public loadYRegWithConstant(): void {
            /*
            A0 07 00 00
            Yreg should be 07
             */
            this.Yreg = Mmu.getByteAtLogicalAddress(this.PC, this.base, this.limit);
        }

        public loadYRegFromMemory(): void {
            /*
            AC 05 00 00 00 08
            Yreg should be 08
             */
            this.Yreg = this.getBytesAtNextAddress(this.PC);
        }

        public noOperation(): void {
            /*
            EA EA EA 00 00
            PC should be 04
             */
            return;
        }

        public brk(): void {
            _KernelInterruptQueue.enqueue(new Interrupt(TERMINATE_PROGRAM_IRQ, [this.pid, this.currentProcess().waitCycles, this.currentProcess().executeCycles]));
        }

        public compareMemoryWithXReg(): void {
            /*
            A2 07 EC 07 00 00 00 07
            Zflag should be 01
             */
            var memory = this.getBytesAtNextAddress(this.PC);
            this.Zflag = memory == this.Xreg ? 1 : 0;
        }

        public branchIfNotEqual(): void {
            /*
            D0 02 A9 07 00 00
            Acc should be 00
             */
            if (this.Zflag === 0) {
                this.PC = (this.PC + Mmu.getByteAtLogicalAddress(this.PC, this.base, this.limit)) % MEMORY_SEGMENT_SIZE;
            }
        }

        public incrementByte(): void {
            /*
            EE 05 00 00 00 08
            0x05 should be 09
             */
            var loc = this.getNextAddress(this.PC);
            var value = this.getBytesAtNextAddress(this.PC);
            Mmu.setByteAtLogicalAddress(loc, value+1, this.base, this.limit);
        }

        public systemCall(): void {
            /*
            A2 01 A0 0A FF 00 00
            Should print 10

            A2 02 A0 07 FF 00 00 45 58 5A 41 43 4B 4C 59 00
            Should print EXZACKLY
             */
            if (this.Xreg == 0x1) {
               _KernelInterruptQueue.enqueue(new Interrupt(SYSCALL_IRQ, this.Yreg.toString()));
           } else if (this.Xreg == 0x2) {
                var memory = Mmu.getBytesAtLogicalAddress(this.Yreg,MEMORY_SEGMENT_SIZE-this.Yreg-1, this.base, this.limit);
                var output = "";
                 for (var i = 0; i < memory.length; i++) {
                     if (memory[i] === 0x0) { break; }
                     output += String.fromCharCode(memory[i]);
                 }
                _KernelInterruptQueue.enqueue(new Interrupt(SYSCALL_IRQ, output));
            }
        }

        public getNextAddress(location: number): number {
            var address = Mmu.getBytesAtLogicalAddress(location, 2, this.base, this.limit);
            // Regarding Kernighan's law: just get it right the first time and you won't ever have to debug
            // If you can't inherently understand this just by looking at it, you really need to ask yourself if you belong here /s
            // Seriously though look up reduce, it can do a lot of cool shit
            return address.reduce((a,v,i) => a + (v * Math.pow(256, i))); // It's not a magic number, we're working in hex
        }

        public getBytesAtNextAddress(location: number): number {
            var address = this.getNextAddress(location);
            var memoryIndex = Mmu.getPhysicalAddress(address, this.base);
            Control.hostHighlightMemoryCell(memoryIndex, 3);
            return Mmu.getByteAtLogicalAddress(address, this.base, this.limit);
        }

    }
}
