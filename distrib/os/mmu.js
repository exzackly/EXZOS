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
        static zeroMemory() {
            for (var i = 0; i < Mmu.segmentStatus.length; i++) {
                if (Mmu.segmentStatus[i] !== -1) {
                    _Scheduler.terminateProcess(Mmu.segmentStatus[i]);
                }
            }
            _Memory.zeroBytes(0, SEGMENT_SIZE * SEGMENT_COUNT);
        }
        static createNewProcess(prog) {
            // Create PCB for new process
            var pid = this.pidIncrementor;
            var base = Mmu.determineBase(pid);
            if (base === -1) {
                //todo: load to memory in project 4
                return -2; // Return value of -2 denotes insufficient memory
            }
            this.pidIncrementor += 1; // Increment for next process
            var limit = base + SEGMENT_SIZE;
            var priority = 0;
            //todo: support variable priority in project 4
            _Scheduler.residentList.push(new TSOS.Pcb(pid, base, limit, priority));
            // Load program into memory
            var progArray = prog.match(/.{2}/g); // Break program into array of length 2 hex codes
            var program = progArray.map(x => TSOS.Utils.fromHex(x)); // Convert program from hex to decimal
            Mmu.zeroBytesWithBaseandLimit(base, limit); // Zero memory
            Mmu.setBytesAtLogicalAddress(0, program, base, limit); // Load program into memory segment
            TSOS.Control.hostUpdateDisplay(); // Update display
            return pid;
        }
        static determineBase(pid) {
            // Find first empty segment (where index of segment status === false)
            for (var i = 0; i < Mmu.segmentStatus.length; i++) {
                if (Mmu.segmentStatus[i] === -1) {
                    Mmu.segmentStatus[i] = pid;
                    return i * SEGMENT_SIZE;
                }
            }
            return -1; // Empty segment not found
        }
        static terminateProcess(pcb) {
            Mmu.zeroBytesWithBaseandLimit(pcb.base, pcb.limit); // Remove program from memory
            var segment = Math.floor(pcb.base / SEGMENT_SIZE);
            Mmu.segmentStatus[segment] = -1; // Clear up segment for reuse
        }
    }
    // Used to keep track of the PID of the process in each segment. -1 indicates that segment is empty
    Mmu.segmentStatus = Array(SEGMENT_COUNT).fill(-1); // Initialize segments with unused (-1) state
    Mmu.pidIncrementor = 0;
    TSOS.Mmu = Mmu;
})(TSOS || (TSOS = {}));
