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

        public static isValidMemoryAccess(segment: number, logicalAddress: number, size: number): boolean {
            if (segment < 0 || // Before first segment
                segment > SEGMENT_COUNT-1 || // After last segment
                logicalAddress < 0x0 || // Before first addressable address
                logicalAddress+size > SEGMENT_SIZE) { // Past last addressable address
                // Memory access violation found; throw shit fit
                _CPU.isExecuting = false;
                _KernelInterruptQueue.enqueue(new Interrupt(MEMORY_ACCESS_VIOLATION_IRQ, _CPU.pid));
                return false;
            }
            return true; // Passes tests
        }

        public static setByteAtLogicalAddress(segment: number, logicalAddress: number, byte: number): void {
            Mmu.setBytesAtLogicalAddress(segment, logicalAddress,[byte])
        }

        public static setBytesAtLogicalAddress(segment: number, logicalAddress: number, bytes: number[]): void {
            if (Mmu.isValidMemoryAccess(segment, logicalAddress, bytes.length) === false) { return; }
            _Memory.setBytes(logicalAddress+(segment*SEGMENT_SIZE), bytes);
        }

        public static getByteAtLogicalAddress(segment: number, logicalAddress: number): number {
            return Mmu.getBytesAtLogicalAddress(segment, logicalAddress, 1)[0];
        }

        public static getBytesAtLogicalAddress(segment: number, logicalAddress: number, size: number): number[] {
            if (Mmu.isValidMemoryAccess(segment, logicalAddress, size) === false) { return [0]; }
            return _Memory.getBytes(logicalAddress+(segment*SEGMENT_SIZE), size);
        }

        public static zeroBytesInSegment(segment: number): void {
            _Memory.zeroBytes((segment*SEGMENT_SIZE), SEGMENT_SIZE);
        }

    }
}
