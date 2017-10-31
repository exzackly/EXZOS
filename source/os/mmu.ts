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

        // Used to keep track of the status of each segment. False indicates that segment is empty
        public static segmentStatus: boolean[] = Array(SEGMENT_COUNT).fill(false); // Initialize segments with unused (false) state

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

        public static determineBase(): number {
            // Find first empty segment (where index of segment status === false)
            for (var i = 0; i < Mmu.segmentStatus.length; i++) {
                if (Mmu.segmentStatus[i] === false) {
                    Mmu.segmentStatus[i] = true;
                    return i*SEGMENT_SIZE;
                }
            }
            return -1; // Empty segment not found
        }

        public static terminateProcess(pcb: Pcb): void {
            Mmu.zeroBytesWithBaseandLimit(pcb.base, pcb.limit); // Remove program from memory
            var segment = Math.floor(pcb.base/SEGMENT_SIZE);
            Mmu.segmentStatus[segment] = false; // Clear up segment for reuse
        }

    }
}
