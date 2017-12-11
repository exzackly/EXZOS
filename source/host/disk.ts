///<reference path="../globals.ts" />

/* ------------
     disk.ts

     Requires global.ts.

     Defines a base disk class. Handles disk memory
     ------------ */

module TSOS {

    export class DiskLocation {

        public static MBR_LOCATION: DiskLocation = new DiskLocation(0, 0, 0);
        public static BLANK_LOCATION: DiskLocation = new DiskLocation(0, 0, 0);

        constructor(public track: number,
                    public sector: number,
                    public block: number) {
        }

        public key(): string {
            return `${this.track}:${this.sector}:${this.block}`
        }

    }

    export class Disk {

        constructor() {
            console.assert(typeof(Storage) !== "undefined"); // Check browser support; will not actually do anything in JavaScript except print to console :/
        }

        public setBlock(location: DiskLocation, bytes: number[]): void {
            var data = bytes.map(x => Utils.toHex(x));
            var padding = new Array(DISK_BLOCK_SIZE - data.length).fill("00"); // Pad bytes with 0 to size of DISK_BLOCK_SIZE
            var replacementData = data.concat(padding);
            sessionStorage.setItem(location.key(), replacementData.join(""));
        }

        public getBlock(location: DiskLocation): number[] {
            var hexData = sessionStorage.getItem(location.key());
            var hexDataArray = hexData.match(/.{2}/g); // Break block into array of length 2 hex codes
            var data = hexDataArray.map(x => Utils.fromHex(x)); // Convert program from hex to decimal
            return data;
        }

        public initializeBlock(location: DiskLocation): void {
            sessionStorage.setItem(location.key(), "00");
        }

    }

}
