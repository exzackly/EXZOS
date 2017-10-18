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
    var Mmu = (function () {
        function Mmu() {
        }
        Mmu.isValidMemoryAccess = function (segment, logicalAddress, size) {
            if (segment < 0 ||
                segment > SEGMENT_COUNT - 1 ||
                logicalAddress < 0x0 ||
                logicalAddress + size >= SEGMENT_SIZE) {
                // Memory access violation found; throw shit fit
                _CPU.isExecuting = false;
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(MEMORY_ACCESS_VIOLATION_IRQ, _CPU.pid));
                return false;
            }
            return true; // Passes tests
        };
        Mmu.setByteAtLogicalAddress = function (segment, logicalAddress, byte) {
            Mmu.setBytesAtLogicalAddress(segment, logicalAddress, [byte]);
        };
        Mmu.setBytesAtLogicalAddress = function (segment, logicalAddress, bytes) {
            if (Mmu.isValidMemoryAccess(segment, logicalAddress, bytes.length) === false) {
                return;
            }
            _Memory.setBytes(logicalAddress + (segment * SEGMENT_SIZE), bytes);
        };
        Mmu.getByteAtLogicalAddress = function (segment, logicalAddress) {
            return Mmu.getBytesAtLogicalAddress(segment, logicalAddress, 1)[0];
        };
        Mmu.getBytesAtLogicalAddress = function (segment, logicalAddress, size) {
            if (Mmu.isValidMemoryAccess(segment, logicalAddress, size) === false) {
                return [0];
            }
            return _Memory.getBytes(logicalAddress + (segment * SEGMENT_SIZE), size);
        };
        Mmu.zeroBytesInSegment = function (segment) {
            _Memory.zeroBytes((segment * SEGMENT_SIZE), SEGMENT_SIZE);
        };
        return Mmu;
    }());
    TSOS.Mmu = Mmu;
})(TSOS || (TSOS = {}));
