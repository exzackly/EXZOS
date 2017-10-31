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
var TSOS;
(function (TSOS) {
    class Mmu {
        static isValidMemoryAccess(logicalAddress, size, base, limit) {
            if ((logicalAddress < 0x0) ||
                (Mmu.getPhysicalAddress(logicalAddress, base) >= limit) ||
                (Mmu.getPhysicalAddress(logicalAddress, base) + size > limit)) {
                // Memory access violation found; throw shit fit
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(MEMORY_ACCESS_VIOLATION_IRQ, _CPU.pid));
                return false;
            }
            return true; // Passes tests
        }
        static getPhysicalAddress(logicalAddress, base) {
            return base + logicalAddress;
        }
        static setByteAtLogicalAddress(logicalAddress, byte, base, limit) {
            Mmu.setBytesAtLogicalAddress(logicalAddress, [byte], base, limit);
        }
        static setBytesAtLogicalAddress(logicalAddress, bytes, base, limit) {
            if (Mmu.isValidMemoryAccess(logicalAddress, bytes.length, base, limit) === false) {
                return;
            }
            _Memory.setBytes(Mmu.getPhysicalAddress(logicalAddress, base), bytes);
        }
        static getByteAtLogicalAddress(logicalAddress, base, limit) {
            return Mmu.getBytesAtLogicalAddress(logicalAddress, 1, base, limit)[0];
        }
        static getBytesAtLogicalAddress(logicalAddress, size, base, limit) {
            if (Mmu.isValidMemoryAccess(logicalAddress, size, base, limit) === false) {
                return [0];
            }
            return _Memory.getBytes(Mmu.getPhysicalAddress(logicalAddress, base), size);
        }
        static zeroBytesWithBaseandLimit(base, limit) {
            _Memory.zeroBytes(base, limit - base);
        }
        static determineBase() {
            // Find first empty segment (where index of segment status === false)
            for (var i = 0; i < Mmu.segmentStatus.length; i++) {
                if (Mmu.segmentStatus[i] === false) {
                    Mmu.segmentStatus[i] = true;
                    return i * SEGMENT_SIZE;
                }
            }
            return -1; // Empty segment not found
        }
        static terminateProcess(pcb) {
            Mmu.zeroBytesWithBaseandLimit(pcb.base, pcb.limit); // Remove program from memory
            var segment = Math.floor(pcb.base / SEGMENT_SIZE);
            console.log("Segment is " + segment);
            Mmu.segmentStatus[segment] = false; // Clear up segment for reuse
        }
    }
    // Used to keep track of the status of each segment. False indicates that segment is empty
    Mmu.segmentStatus = Array(SEGMENT_COUNT).fill(false); // Initialize segments with unused (false) state
    TSOS.Mmu = Mmu;
})(TSOS || (TSOS = {}));
