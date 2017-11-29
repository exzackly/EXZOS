///<reference path="../globals.ts" />
/* ------------
     disk.ts

     Requires global.ts.

     Defines a base disk class. Handles disk memory
     ------------ */
var TSOS;
(function (TSOS) {
    class DiskLocation {
        constructor(track, sector, block) {
            this.track = track;
            this.sector = sector;
            this.block = block;
        }
        key() {
            return `${this.track}:${this.sector}:${this.block}`;
        }
    }
    DiskLocation.MBR_LOCATION = new DiskLocation(0, 0, 0);
    TSOS.DiskLocation = DiskLocation;
    class Disk {
        constructor() {
            console.assert(typeof (Storage) !== "undefined"); // Check browser support; will not actually do anything in JavaScript except print to console :/
        }
        setBlock(location, bytes) {
            var data = bytes.map(x => TSOS.Utils.toHex(x));
            var padding = new Array(DISK_BLOCK_SIZE - data.length).fill("00"); // Pad bytes with 0 to size of DISK_BLOCK_SIZE
            var replacementData = data.concat(padding);
            localStorage.setItem(location.key(), replacementData.join(""));
        }
        getBlock(location) {
            var hexData = localStorage.getItem(location.key());
            var hexDataArray = hexData.match(/.{2}/g); // Break block into array of length 2 hex codes
            var data = hexDataArray.map(x => TSOS.Utils.fromHex(x)); // Convert program from hex to decimal
            return data;
        }
    }
    TSOS.Disk = Disk;
})(TSOS || (TSOS = {}));
