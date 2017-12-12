///<reference path="../globals.ts" />

/* ------------
     memory.ts

     Requires global.ts.

     Defines a base memory class. Handles memory
     ------------ */

module TSOS {

    export class Memory {

        constructor(public bytes: number[] = new Array(MEMORY_SEGMENT_SIZE * MEMORY_SEGMENT_COUNT)) {
            this.zeroBytes(0, bytes.length);
        }

        public setBytes(location: number, bytes: number[]): void {
            for (var i = 0; i < bytes.length; i++) {
                this.bytes[location + i] = bytes[i];
            }
        }

        public getBytes(location: number, size: number = 1): number[] {
            if (size < 0) {
                return [];
            }
            return this.bytes.slice(location, location + size);
        }

        public zeroBytes(location: number, size: number): void {
            for (var i = location; i < location + size; i++) {
                this.bytes[i] = 0x0;
            }
        }

    }

}
