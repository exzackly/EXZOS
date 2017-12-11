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
                (logicalAddress >= limit) ||
                (logicalAddress + size > limit)) {
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
        static zeroBytesWithBaseAndLimit(base, limit) {
            _Memory.zeroBytes(base, limit);
        }
        static zeroMemory() {
            for (var i = 0; i < Mmu.segmentStatus.length; i++) {
                if (Mmu.segmentStatus[i] !== -1) {
                    _Scheduler.terminateProcess(Mmu.segmentStatus[i]);
                }
            }
            _Memory.zeroBytes(0, MEMORY_SEGMENT_SIZE * MEMORY_SEGMENT_COUNT);
        }
        static createNewProcess(priority, program) {
            // Create PCB for new process
            var pid = this.pidIncrementor;
            var base = Mmu.determineBase(pid);
            this.pidIncrementor += 1; // Increment for next process
            var limit = base !== -1 ? MEMORY_SEGMENT_SIZE : -1;
            _Scheduler.residentList.push(new TSOS.Pcb(pid, base, limit, priority));
            _Scheduler.sortResidentList();
            // Store program...
            var prog = program.map(x => TSOS.Utils.fromHex(x)); // Convert program from hex to decimal
            if (base !== -1) {
                // ... in memory
                Mmu.zeroBytesWithBaseAndLimit(base, limit); // Zero memory
                Mmu.setBytesAtLogicalAddress(0, prog, base, limit); // Load program into memory segment
            }
            else {
                // ... on disk
                TSOS.Devices.hostStoreProgramOnDisk(pid, prog);
            }
            TSOS.Control.hostUpdateDisplay(); // Update display
            return pid;
        }
        static rollOutProcessToDisk(pid) {
            var process = _Scheduler.getProcessForPid(pid);
            var memory = Mmu.getBytesAtLogicalAddress(0, MEMORY_SEGMENT_SIZE, process.base, process.limit);
            Mmu.clearSegmentForProcess(process);
            TSOS.Devices.hostStoreProgramOnDisk(pid, memory);
        }
        static rollInProcessFromDisk(pid) {
            var process = _Scheduler.getProcessForPid(pid);
            var base = Mmu.determineBase(pid);
            var limit = base !== -1 ? MEMORY_SEGMENT_SIZE : -1;
            process.base = base;
            process.limit = limit;
            TSOS.Devices.hostLoadProgramFromDisk(pid);
        }
        static determineBase(pid) {
            // Find first empty segment (where index of segment status === false)
            for (var i = 0; i < Mmu.segmentStatus.length; i++) {
                if (Mmu.segmentStatus[i] === -1) {
                    Mmu.segmentStatus[i] = pid;
                    return i * MEMORY_SEGMENT_SIZE;
                }
            }
            return -1; // Empty segment not found
        }
        static clearSegmentForProcess(pcb) {
            var segment = Math.floor(pcb.base / MEMORY_SEGMENT_SIZE);
            Mmu.segmentStatus[segment] = -1; // Mark segment as free
            pcb.base = -1;
            pcb.limit = -1;
        }
        static terminateProcess(pcb) {
            if (pcb.base === -1 || pcb.limit === -1) {
                TSOS.Devices.hostDeleteProgramFromDisk(pcb.pid);
            }
            else {
                Mmu.zeroBytesWithBaseAndLimit(pcb.base, pcb.limit); // Remove program from memory
                Mmu.clearSegmentForProcess(pcb); // Clear up segment for reuse
            }
        }
    }
    // Used to keep track of the PID of the process in each segment. -1 indicates that segment is empty
    Mmu.segmentStatus = Array(MEMORY_SEGMENT_COUNT).fill(-1); // Initialize segments with unused (-1) state
    Mmu.pidIncrementor = 0;
    TSOS.Mmu = Mmu;
})(TSOS || (TSOS = {}));
