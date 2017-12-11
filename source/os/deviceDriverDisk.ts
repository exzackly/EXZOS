///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />

/* ----------------------------------
   DeviceDriverDisk.ts

   Requires deviceDriver.ts

   The Kernel Disk Device Driver.
   ---------------------------------- */

module TSOS {

    export class DiskData {

        constructor(public location: DiskLocation,
                    private data: number[] = null) {
            this.data = _Disk.getBlock(location);
        }

        private updateDisk(): void {
            _Disk.setBlock(this.location, this.data);
        }

        public isDirectory(): boolean {
            return this.location.track === 0; // All tracks with value of 0 are directory blocks
        }

        public isUsed(): boolean {
            return this.data[0] === 1; // First byte indicates used status
        }

        public setUsed(): void {
            this.data[0] = 1; // First byte indicates used status
            this.updateDisk();
        }

        public setFree(): void {
            this.data[0] = 0; // First byte indicates status of used
            this.updateDisk();
        }

        public setNextLocation(location: DiskLocation): void {
            this.data[1] = location.track; // Second byte indicates track
            this.data[2] = location.sector; // Third byte indicates sector
            this.data[3] = location.block; // Fourth byte indicates block
            this.updateDisk();
        }

        public nextLocation(): DiskLocation {
            if (this.data[1] === 0 && this.data[2] === 0 && this.data[3] === 0) { // No next location
                return null;
            }
            return new DiskLocation(this.data[1], this.data[2], this.data[3]);
        }

        public setWritableData(data: number[]) {
            this.data = this.data.slice(0, DISK_BLOCK_RESERVED_SIZE).concat(data); // Preserve directory chunk
            this.updateDisk();
        }

        public writableChunk(): number[] {
            return this.data.slice(DISK_BLOCK_RESERVED_SIZE); // Ignore directory chunk
        }

        public zero(type: FormatType): void {
            if (type === FormatType.Quick) {
                this.data.splice(0, DISK_BLOCK_RESERVED_SIZE, ...[0,0,0,0]); /// Format directory chunk
            } else if (type === FormatType.Full) {
                this.data = [];
            }
            this.updateDisk();
        }

    }

    export enum LocationSearchType {
        DirectorySearch,
        FileSearch
    }

    export enum FormatType {
        Quick,
        Full
    }

    export enum LSType {
        Normal,
        Long
    }

    // Extends DeviceDriver
    export class DeviceDriverDisk extends DeviceDriver {

        public static DEVICE_DRIVER_DISK_WRITE_PROGRAM: number = 1;
        public static DEVICE_DRIVER_DISK_READ_PROGRAM: number = 2;
        public static DEVICE_DRIVER_DISK_DELETE_PROGRAM: number = 3;

        public static DEVICE_DRIVER_DISK_CREATE_FILE: number = 4;
        public static DEVICE_DRIVER_DISK_READ_FILE: number = 5;
        public static DEVICE_DRIVER_DISK_WRITE_FILE: number = 6;
        public static DEVICE_DRIVER_DISK_DELETE_FILE: number = 7;

        public static DEVICE_DRIVER_DISK_FORMAT: number = 8;
        public static DEVICE_DRIVER_DISK_LS: number = 9;

        private static DEVICE_DRIVER_DISK_PROGRAM_PREFIX: string = "~";
        private static DEVICE_DRIVER_DISK_HIDDEN_FILE_PREFIX: string = ".";
        private static DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX: string = String.fromCharCode(31); // ASCII unit separator

        public static DEVICE_DRIVER_DISK_MAX_FILENAME_SIZE: number = 32;

        constructor() {
            // Override the base method pointers.

            // The code below cannot run because "this" can only be
            // accessed after calling super.
            //super(this.krnKbdDriverEntry, this.krnKbdDispatchKeyPress);
            super();
            this.driverEntry = this.krnKbdDriverEntry;
            this.isr = this.krnDiskHandleRequest;
        }

        public krnKbdDriverEntry() {
            // Initialization routine for this, the kernel-mode Keyboard Device Driver.
            this.status = "loaded";
            this.format(FormatType.Full, true);
            Control.hostUpdateDisplayDisk();
        }

        public krnDiskHandleRequest(params) {
            if (params.length < 2) { // Fail safe; should never happen
                return;
            }
            _Kernel.krnTrace("Disk operation~" + params[0]);
            switch (params[0]) {
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_WRITE_PROGRAM:
                    if (this.writeProgramToDisk(params[1], params[2]) !== true) { // Fail safe; should never happen
                        _StdOut.putText(`Error: PID ${params[1]} could not be written to disk. Terminating...`);
                        _Scheduler.terminateProcess(params[1]); // Terminate process to prevent chaos
                        _StdOut.advanceLine();
                        _OsShell.putPrompt();
                    }
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_READ_PROGRAM:
                    if (this.retrieveProgramFromDisk(params[1]) !== true) { // Fail safe; should never happen
                        _StdOut.putText(`Error: PID ${params[1]} could not be read from disk. Terminating...`);
                        _Scheduler.terminateProcess(params[1]); // Terminate process to prevent chaos
                        _StdOut.advanceLine();
                        _OsShell.putPrompt();
                    }
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_DELETE_PROGRAM:
                    if (this.removeProgramFromDisk(params[1]) !== false) { // Fail safe; should never happen
                        _Kernel.krnTrace(`Error: file ${params[1]} could not be deleted`);
                    }
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_CREATE_FILE:
                    if (!params[1].startsWith(DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX) &&
                        !params[1].includes(DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX) &&
                        this.createOnDisk(params[1]) !== null) {
                        _StdOut.putText(`File ${params[1]} successfully created.`);
                    } else {
                        _StdOut.putText(`Error: file ${params[1]} could not be created.`);
                    }
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_READ_FILE:
                    var output = this.retrieveFromDisk(params[1]);
                    if (output !== null) {
                        _StdOut.putText(Utils.fromHexArray(output));
                    } else {
                        _StdOut.putText(`Error: file ${params[1]} could not be read.`);
                    }
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_WRITE_FILE:
                    if (this.writeFileToDisk(params[1], params[2]) === true) {
                        _StdOut.putText(`File ${params[1]} successfully written.`);
                    } else {
                        _StdOut.putText(`Error: file ${params[1]} could not be written.`);
                    }
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_DELETE_FILE:
                    if (this.removeFromDisk(params[1]) === true) {
                        _StdOut.putText(`File ${params[1]} successfully deleted.`);
                    } else {
                        _StdOut.putText(`Error: file ${params[1]} could not be deleted.`);
                    }
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_FORMAT:
                    this.format(params[1]);
                    _StdOut.putText("Disk successfully formatted.");
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_LS:
                    var files = this.getFiles(params[1]);
                    if (files.length === 0) {
                        _StdOut.putText("No files on disk.");
                    } else {
                        for (var i = 0; i < files.length; i++) {
                            _StdOut.advanceLine();
                            _StdOut.putText(files[i]);
                        }
                    }
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                default:
                    _Kernel.krnTrapError("Invalid Disk Handle Request. params=[" + params + "]");
            }
            Control.hostUpdateDisplayDisk();
        }

        // Iterates all locations on disk. Takes an action lambda function of what to do with each location
        public iterateDisk(trackLocationStart: number, trackLocationEnd: number, action: (location: DiskLocation) => DiskLocation): DiskLocation {
            for (var track = trackLocationStart; track < trackLocationEnd; track++) {
                for (var sector = 0; sector < DISK_SECTOR_COUNT; sector++) {
                    for (var block = 0; block < DISK_BLOCK_COUNT; block++) {
                        var location = new DiskLocation(track, sector, block);
                        var res = action(location); // Functional programming is cool
                        if (res !== null) {
                            return res;
                        }
                    }
                }
            }
            return null;
        }

        // Iterates a disk chain (follows next location until null). Takes an action lambda function of what to do with each location
        public iterateDiskChain(filename: string, action: (param) => void): boolean {
            var location = this.locationForFilename(filename);
            if (location === null) {
                return false;
            }
            while (location !== null) {
                var data = new DiskData(location);
                action(data); // Functional programming is cool
                location = data.nextLocation();
            }
            return true;
        }

        public writeProgramToDisk(pid: number, program: number[]): boolean {
            _Kernel.krnTrace(`Roll out PID ${pid}`);
            var filename = `${DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX}${pid}`;
            var directoryLocation = this.createOnDisk(filename);
            if (directoryLocation === null) {
                return false;
            }
            return this.writeToDisk(directoryLocation, program);
        }

        public retrieveProgramFromDisk(pid: number): boolean {
            _Kernel.krnTrace(`Roll in PID ${pid}`);
            var filename = `${DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX}${pid}`;
            var process = _Scheduler.getProcessForPid(pid);
            var program = this.retrieveFromDisk(filename);
            this.removeProgramFromDisk(pid);
            if (program === null) { // Fail safe; should never happen
                return false;
            }
            program = program.slice(0, MEMORY_SEGMENT_SIZE); // Truncate file to segment size
            Mmu.zeroBytesWithBaseAndLimit(process.base, process.limit); // Zero memory
            Mmu.setBytesAtLogicalAddress(0, program, process.base, process.limit); // Load program into memory segment
            return true;
        }

        public removeProgramFromDisk(pid: number): boolean {
            var filename = `${DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX}${pid}`;
            return this.removeFromDisk(filename);
        }

        public createOnDisk(filename: string): DiskLocation {
            if (filename.length > DeviceDriverDisk.DEVICE_DRIVER_DISK_MAX_FILENAME_SIZE) {
                return null; // Filename larger than max
            }
            if (this.locationForFilename(filename) !== null) {
                return null; // File with specified filename already exists
            }
            var location = this.determineFreeLocation(LocationSearchType.DirectorySearch);
            if (location === null) {
                return null; // Free directory location could not be found
            }
            var data = new DiskData(location);
            data.setUsed();
            var createDate = new Date(Date.now()).toLocaleString();
            var newDirectoryData = this.createFileDirectoryData(filename, 0, createDate);
            data.setWritableData(newDirectoryData);
            return location;
        }

        public retrieveFromDisk(filename: string): number[] {
            var fileData: number[] = [];
            var action = (param): void => {// Lambda function to concat file data
                if (param.isDirectory() === false) { // Skip directory block
                    fileData.push(...param.writableChunk()); // Append data to output
                }
            };
            return this.iterateDiskChain(filename, action) === true ? fileData : null; // Functional programming is cool
        }

        public writeFileToDisk(filename: string, file: string): boolean {
            var directoryLocation = this.locationForFilename(filename);
            if (directoryLocation === null) { // Fail safe; should never happen
                _Kernel.krnTrace(`Error: file ${filename} could not be found`);
                return false;
            }
            var data = Utils.toHexArray(file);
            return this.writeToDisk(directoryLocation, data);
        }

        public removeFromDisk(filename: string): boolean {
            var action = (param): void => { // Lambda function to mark all blocks as free
                param.setFree(); // Set data to unused state
            };
            return this.iterateDiskChain(filename, action) === true ? true : false; // Functional programming is cool
        }

        public writeToDisk(directoryLocation: DiskLocation, file: number[]): boolean {
            if (file.length === 0) {
                return false;
            }
            var locations = this.allocateDiskSpace(file.length); // Allocate enough disk space for given data
            if (locations === null) {
                return false;
            }
            // Write directory block
            var data = new DiskData(directoryLocation);
            data.setNextLocation(locations[0]);
            var oldDirectoryData = this.parseFileDirectoryData(data.writableChunk());
            var newDirectoryData = this.createFileDirectoryData(oldDirectoryData[0], file.length, oldDirectoryData[2]);
            data.setWritableData(newDirectoryData);
            // Write data blocks
            for (var i = 0; i < locations.length; i++) {
                var nextLocation = i + 1 < locations.length ? locations[i + 1] : new DiskLocation(0, 0, 0); // Last location has "next" of 0:0:0
                var data = new DiskData(locations[i]);
                data.setUsed();
                data.setNextLocation(nextLocation);
                var writableChunk = file.splice(0, DISK_BLOCK_WRITABLE_SIZE);
                data.setWritableData(writableChunk)
            }
            return true;
        }

        public allocateDiskSpace(size: number): DiskLocation[] {
            var locations: DiskLocation[] = [];
            var locationsNeeded = Math.ceil(size / DISK_BLOCK_WRITABLE_SIZE); // Ceiling needed to store last portion
            for (var i = 0; i < locationsNeeded; i++) {
                var location = this.determineFreeLocation(LocationSearchType.FileSearch);
                if (location === null) {
                    return null;
                }
                locations.push(location);
            }
            return locations;
        }

        public determineFreeLocation(searchType: LocationSearchType): DiskLocation {
            //todo: Update and use MBR
            var trackLocationStart; // Different search types require different start and end points
            var trackLocationEnd;
            if (searchType == LocationSearchType.DirectorySearch) {
                trackLocationStart = 0;
                trackLocationEnd = 1;
            } else if (searchType == LocationSearchType.FileSearch) {
                trackLocationStart = 1;
                trackLocationEnd = DISK_TRACK_COUNT;
            }
            var action = (location: DiskLocation): DiskLocation => { // Lambda function to determine and return unused location
                var data = new DiskData(location);
                if (data.isUsed() === false) {
                    data.setUsed();
                    return data.location;
                }
                return null;
            };
            return this.iterateDisk(trackLocationStart, trackLocationEnd, action); // Functional programming is cool
        }

        public locationForFilename(filename: string): DiskLocation {
            var action = (location: DiskLocation): DiskLocation => { // Lambda function to determine location for filename
                var data = new DiskData(location);
                if (data.location.sector === 0 && data.location.block === 0) { // Skip MBR; cannot change starting point to 0, as needed (e.g. 0:1:0)
                    return null;
                }
                if (data.isUsed() === false) {
                    return null; // Block is unused; skip
                }
                var directoryData = this.parseFileDirectoryData(data.writableChunk());
                if (directoryData[0] === filename) {
                    return data.location;
                }
                return null;
            };
            return this.iterateDisk(0, 1, action); // Functional programming is cool
        }

        public format(type: FormatType, initialize: boolean = false): void {
            var action = (location: DiskLocation): DiskLocation => { // Lambda function to zero each data block
                if (initialize === true) {
                    _Disk.initializeBlock(location);
                }
                var data = new DiskData(location);
                data.zero(type);
                return null;
            };
            this.iterateDisk(0, DISK_TRACK_COUNT, action); // Functional programming is cool
            // Initialize MBR
            var MBRData = new DiskData(DiskLocation.MBR_LOCATION);
            MBRData.setUsed();
            MBRData.setWritableData([0, 0, 1, 1, 0, 0]);
        }

        public getFiles(type: LSType): string[] {
            var files: string[] = [];
            var action = (location: DiskLocation): DiskLocation => { // Lambda function to aggregate files
                var data = new DiskData(location);
                if (data.location.sector === 0 && data.location.block === 0) { // Skip MBR; cannot change starting point to 0, as needed (e.g. 0:1:0)
                    return null;
                }
                if (data.isUsed() === false) {
                    return null; // Block is unused; skip
                }
                var directoryData = this.parseFileDirectoryData(data.writableChunk());
                if (type === LSType.Normal) {
                    if (!directoryData[0].startsWith(DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX) &&
                        !directoryData[0].startsWith(DeviceDriverDisk.DEVICE_DRIVER_DISK_HIDDEN_FILE_PREFIX)) { // Filter out hidden files
                        files.push(directoryData[0]);
                    }
                } else if (type === LSType.Long) {
                    files.push(directoryData.join(" "));
                }
                return null;
            };
            this.iterateDisk(0, 1, action); // Functional programming is cool
            return files;
        }

        public parseFileDirectoryData(data: number[]): string[] {
            var directoryData = Utils.fromHexArray(data).split(DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX);
            if (directoryData.length === 3) {
                return [directoryData[0], directoryData[1], directoryData[2]]
            } else { // Something went wrong; provide default values with filename
                var date = new Date(Date.now()).toLocaleString();
                return [directoryData.join(""), "0", date];
            }
        }

        public createFileDirectoryData(filename: string, size: number, date: string): number[] {
            var newDirectoryData = filename + DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX +
                size + DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX + date;
            return Utils.toHexArray(newDirectoryData);
        }

    }

}