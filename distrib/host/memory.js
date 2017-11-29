///<reference path="../globals.ts" />
/* ------------
     memory.ts

     Requires global.ts.

     Defines a base memory class. Handles memory
     ------------ */
var TSOS;
(function (TSOS) {
    class Memory {
        constructor(bytes = new Array(MEMORY_SEGMENT_SIZE * MEMORY_SEGMENT_COUNT)) {
            this.bytes = bytes;
            this.zeroBytes(0, bytes.length);
        }
        setBytes(location, bytes) {
            for (var i = 0; i < bytes.length; i++) {
                this.bytes[location + i] = bytes[i];
            }
        }
        getBytes(location, size = 1) {
            if (size < 0) {
                return [];
            }
            return this.bytes.slice(location, location + size);
        }
        zeroBytes(location, size) {
            for (var i = location; i < location + size; i++) {
                this.bytes[i] = 0x0;
            }
        }
    }
    TSOS.Memory = Memory;
})(TSOS || (TSOS = {}));
