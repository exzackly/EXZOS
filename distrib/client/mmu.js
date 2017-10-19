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
        static isValidMemoryAccess(segment, logicalAddress, size) {
            if (segment < 0 ||
                segment > SEGMENT_COUNT - 1 ||
                logicalAddress < 0x0 ||
                logicalAddress + size > SEGMENT_SIZE) {
                // Memory access violation found; throw shit fit
                _CPU.isExecuting = false;
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(MEMORY_ACCESS_VIOLATION_IRQ, _CPU.pid));
                return false;
            }
            return true; // Passes tests
        }
        static setByteAtLogicalAddress(segment, logicalAddress, byte) {
            Mmu.setBytesAtLogicalAddress(segment, logicalAddress, [byte]);
        }
        static setBytesAtLogicalAddress(segment, logicalAddress, bytes) {
            if (Mmu.isValidMemoryAccess(segment, logicalAddress, bytes.length) === false) {
                return;
            }
            _Memory.setBytes(logicalAddress + (segment * SEGMENT_SIZE), bytes);
        }
        static getByteAtLogicalAddress(segment, logicalAddress) {
            return Mmu.getBytesAtLogicalAddress(segment, logicalAddress, 1)[0];
        }
        static getBytesAtLogicalAddress(segment, logicalAddress, size) {
            if (Mmu.isValidMemoryAccess(segment, logicalAddress, size) === false) {
                return [0];
            }
            return _Memory.getBytes(logicalAddress + (segment * SEGMENT_SIZE), size);
        }
        static zeroBytesInSegment(segment) {
            _Memory.zeroBytes((segment * SEGMENT_SIZE), SEGMENT_SIZE);
        }
        static determineSegment() {
            // Find first empty segment (where index of segment status === false)
            for (var i = 0; i < Mmu.segmentStatus.length; i++) {
                if (Mmu.segmentStatus[i] === false) {
                    Mmu.segmentStatus[i] = true;
                    return i;
                }
            }
            return -1; // Empty segment not found
        }
    }
    // Used to keep track of the status of each segment. False indicates that segment is empty
    Mmu.segmentStatus = Array(SEGMENT_COUNT).fill(false); // Initialize segments with unused (false) state
    TSOS.Mmu = Mmu;
})(TSOS || (TSOS = {}));
