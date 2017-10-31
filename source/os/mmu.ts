/* ------------
     mmu.ts

     Requires globals.ts
              kernel.ts
              cpu.ts
              memory.ts
              interrupt.ts

     Handles the mapping of logical addresses to physical addresses.
     Also used to check for memory access violations, and to zero segments of memory
     ------------ */

module TSOS {

    export class Mmu {

        // Used to keep track of the PID of the process in each segment. -1 indicates that segment is empty
        public static segmentStatus: number[] = Array(SEGMENT_COUNT).fill(-1); // Initialize segments with unused (-1) state
        public static pidIncrementor: number = 0;

        public static isValidMemoryAccess(logicalAddress: number, size: number, base: number, limit: number): boolean {
            if ((logicalAddress < 0x0) || // Before first addressable address
                (Mmu.getPhysicalAddress(logicalAddress, base) >= limit) || // Past last addressable address
                (Mmu.getPhysicalAddress(logicalAddress, base)+size > limit)) { // Past last addressable address
                // Memory access violation found; throw shit fit
                _KernelInterruptQueue.enqueue(new Interrupt(MEMORY_ACCESS_VIOLATION_IRQ, _CPU.pid));
                return false;
            }
            return true; // Passes tests
        }

        public static getPhysicalAddress(logicalAddress: number, base: number): number {
            return base+logicalAddress;
        }

        public static setByteAtLogicalAddress(logicalAddress: number, byte: number, base: number, limit: number): void {
            Mmu.setBytesAtLogicalAddress(logicalAddress,[byte], base, limit);
        }

        public static setBytesAtLogicalAddress(logicalAddress: number, bytes: number[], base: number, limit: number): void {
            if (Mmu.isValidMemoryAccess(logicalAddress, bytes.length, base, limit) === false) { return; }
            _Memory.setBytes(Mmu.getPhysicalAddress(logicalAddress, base), bytes);
        }

        public static getByteAtLogicalAddress(logicalAddress: number, base: number, limit: number): number {
            return Mmu.getBytesAtLogicalAddress(logicalAddress, 1, base, limit)[0];
        }

        public static getBytesAtLogicalAddress(logicalAddress: number, size: number, base: number, limit: number): number[] {
            if (Mmu.isValidMemoryAccess(logicalAddress, size, base, limit) === false) { return [0]; }
            return _Memory.getBytes(Mmu.getPhysicalAddress(logicalAddress, base), size);
        }

        public static zeroBytesWithBaseandLimit(base: number, limit: number): void {
            _Memory.zeroBytes(base, limit-base);
        }

        public static zeroMemory(): void {
            for (var i = 0; i < Mmu.segmentStatus.length; i++) { // Kill processes in all segments
                if (Mmu.segmentStatus[i] !== -1) { // PID -1 indicates segment empty
                    _Scheduler.terminateProcess(Mmu.segmentStatus[i]);
                }
            }
            _Memory.zeroBytes(0, SEGMENT_SIZE*SEGMENT_COUNT);
        }

        public static createNewProcess(prog: string): number {
            // Create PCB for new process
            var pid = this.pidIncrementor;
            var base = Mmu.determineBase(pid);
            if (base === -1) { // Empty segment not found
                //todo: load to memory in project 4
                return -2; // Return value of -2 denotes insufficient memory
            }
            this.pidIncrementor += 1; // Increment for next process
            var limit = base+SEGMENT_SIZE;
            var priority = 0;
            //todo: support variable priority in project 3
            _Scheduler.residentList.push(new Pcb(pid, base, limit, priority));

            // Load program into memory
            var progArray = prog.match(/.{2}/g); // Break program into array of length 2 hex codes
            var program = progArray.map(x => Utils.fromHex(x)); // Convert program from hex to decimal

            Mmu.zeroBytesWithBaseandLimit(base, limit); // Zero memory
            Mmu.setBytesAtLogicalAddress(0, program, base, limit); // Load program into memory segment

            Control.hostUpdateDisplay(); // Update display

            return pid;
        }

        public static determineBase(pid: number): number {
            // Find first empty segment (where index of segment status === false)
            for (var i = 0; i < Mmu.segmentStatus.length; i++) {
                if (Mmu.segmentStatus[i] === -1) {
                    Mmu.segmentStatus[i] = pid;
                    return i*SEGMENT_SIZE;
                }
            }
            return -1; // Empty segment not found
        }

        public static terminateProcess(pcb: Pcb): void {
            Mmu.zeroBytesWithBaseandLimit(pcb.base, pcb.limit); // Remove program from memory
            var segment = Math.floor(pcb.base/SEGMENT_SIZE);
            Mmu.segmentStatus[segment] = -1; // Clear up segment for reuse
        }

    }
}
