///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />
/* ----------------------------------
   DeviceDriverDisk.ts

   Requires deviceDriver.ts

   The Kernel Disk Device Driver.
   ---------------------------------- */
var TSOS;
(function (TSOS) {
    class DiskData {
        constructor(location, data = null) {
            this.location = location;
            this.data = data;
            this.data = _Disk.getBlock(location);
        }
        updateDisk() {
            _Disk.setBlock(this.location, this.data);
        }
        isDirectory() {
            return this.location.track === 0; // All tracks with value of 0 are directory blocks
        }
        isUsed() {
            return this.data[0] === 1; // First byte indicates used status
        }
        setUsed() {
            this.data[0] = 1; // First byte indicates used status
            this.updateDisk();
        }
        setFree() {
            this.data[0] = 0; // First byte indicates status of used
            this.updateDisk();
        }
        setNextLocation(location) {
            this.data[1] = location.track; // Second byte indicates track
            this.data[2] = location.sector; // Third byte indicates sector
            this.data[3] = location.block; // Fourth byte indicates block
            this.updateDisk();
        }
        nextLocation() {
            if (this.data[1] === 0 && this.data[2] === 0 && this.data[3] === 0) {
                return null;
            }
            return new TSOS.DiskLocation(this.data[1], this.data[2], this.data[3]);
        }
        setWritableData(data) {
            this.data = this.data.slice(0, DISK_BLOCK_RESERVED_SIZE).concat(data); // Preserve directory chunk
            this.updateDisk();
        }
        writableChunk() {
            return this.data.slice(DISK_BLOCK_RESERVED_SIZE); // Ignore directory chunk
        }
        zero() {
            this.data = [];
            this.updateDisk();
        }
    }
    TSOS.DiskData = DiskData;
    let LocationSearchType;
    (function (LocationSearchType) {
        LocationSearchType[LocationSearchType["DirectorySearch"] = 0] = "DirectorySearch";
        LocationSearchType[LocationSearchType["FileSearch"] = 1] = "FileSearch";
    })(LocationSearchType = TSOS.LocationSearchType || (TSOS.LocationSearchType = {}));
    let LSType;
    (function (LSType) {
        LSType[LSType["Normal"] = 0] = "Normal";
        LSType[LSType["Long"] = 1] = "Long";
    })(LSType = TSOS.LSType || (TSOS.LSType = {}));
    // Extends DeviceDriver
    class DeviceDriverDisk extends TSOS.DeviceDriver {
        constructor() {
            // Override the base method pointers.
            // The code below cannot run because "this" can only be
            // accessed after calling super.
            //super(this.krnKbdDriverEntry, this.krnKbdDispatchKeyPress);
            super();
            this.driverEntry = this.krnKbdDriverEntry;
            this.isr = this.krnDiskHandleRequest;
        }
        krnKbdDriverEntry() {
            // Initialization routine for this, the kernel-mode Keyboard Device Driver.
            this.status = "loaded";
            this.format(true);
            TSOS.Control.hostUpdateDisplayDisk();
        }
        krnDiskHandleRequest(params) {
            if (params.length === 0) {
                return;
            }
            _Kernel.krnTrace("Disk operation~" + params[0]);
            switch (params[0]) {
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_WRITE_PROGRAM:
                    if (this.writeProgramToDisk(params[1], params[2]) !== true) {
                        _StdOut.putText(`Error: PID ${params[1]} could not be written to disk. Terminating...`);
                        _Scheduler.terminateProcess(params[1]); // Terminate process to prevent chaos
                        _StdOut.advanceLine();
                        _OsShell.putPrompt();
                    }
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_READ_PROGRAM:
                    if (this.retrieveProgramFromDisk(params[1]) !== true) {
                        _StdOut.putText(`Error: PID ${params[1]} could not be read from disk. Terminating...`);
                        _Scheduler.terminateProcess(params[1]); // Terminate process to prevent chaos
                        _StdOut.advanceLine();
                        _OsShell.putPrompt();
                    }
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_DELETE_PROGRAM:
                    if (this.removeProgramFromDisk(params[1]) !== false) {
                        _Kernel.krnTrace(`Error: file ${params[1]} could not be deleted`);
                    }
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_CREATE_FILE:
                    if (!params[1].startsWith(DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX) &&
                        !params[1].includes(DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX) &&
                        this.createOnDisk(params[1]) !== null) {
                        _StdOut.putText(`File ${params[1]} successfully created.`);
                    }
                    else {
                        _StdOut.putText(`Error: file ${params[1]} could not be created.`);
                    }
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_READ_FILE:
                    var output = this.retrieveFromDisk(params[1]);
                    if (output !== null) {
                        _StdOut.putText(TSOS.Utils.fromHexArray(output));
                    }
                    else {
                        _StdOut.putText(`Error: file ${params[1]} could not be read.`);
                    }
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_WRITE_FILE:
                    if (this.writeFileToDisk(params[1], params[2]) === true) {
                        _StdOut.putText(`File ${params[1]} successfully written.`);
                    }
                    else {
                        _StdOut.putText(`Error: file ${params[1]} could not be written.`);
                    }
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_DELETE_FILE:
                    if (this.removeFromDisk(params[1]) === true) {
                        _StdOut.putText(`File ${params[1]} successfully deleted.`);
                    }
                    else {
                        _StdOut.putText(`Error: file ${params[1]} could not be deleted.`);
                    }
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_FORMAT:
                    this.format();
                    _StdOut.putText("Disk successfully formatted.");
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_LS:
                    var files = this.getFiles(params[1]);
                    if (files.length === 0) {
                        _StdOut.putText("No files on disk.");
                    }
                    else {
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
            TSOS.Control.hostUpdateDisplayDisk();
        }
        // Iterates all locations on disk. Takes an action lambda function of what to do with each location
        iterateDisk(trackLocationStart, trackLocationEnd, action) {
            for (var track = trackLocationStart; track < trackLocationEnd; track++) {
                for (var sector = 0; sector < DISK_SECTOR_COUNT; sector++) {
                    for (var block = 0; block < DISK_BLOCK_COUNT; block++) {
                        var location = new TSOS.DiskLocation(track, sector, block);
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
        iterateDiskChain(filename, action) {
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
        writeProgramToDisk(pid, program) {
            _Kernel.krnTrace(`Roll out PID ${pid}`);
            var filename = `${DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX}${pid}`;
            var directoryLocation = this.createOnDisk(filename);
            if (directoryLocation === null) {
                return false;
            }
            return this.writeToDisk(directoryLocation, program);
        }
        retrieveProgramFromDisk(pid) {
            _Kernel.krnTrace(`Roll in PID ${pid}`);
            var filename = `${DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX}${pid}`;
            var process = _Scheduler.getProcessForPid(pid);
            var program = this.retrieveFromDisk(filename).slice(0, MEMORY_SEGMENT_SIZE); // Truncate file to segment size
            this.removeProgramFromDisk(pid);
            if (program === null) {
                return false;
            }
            TSOS.Mmu.zeroBytesWithBaseAndLimit(process.base, process.limit); // Zero memory
            TSOS.Mmu.setBytesAtLogicalAddress(0, program, process.base, process.limit); // Load program into memory segment
            return true;
        }
        removeProgramFromDisk(pid) {
            var filename = `${DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX}${pid}`;
            return this.removeFromDisk(filename);
        }
        createOnDisk(filename) {
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
        retrieveFromDisk(filename) {
            var fileData = [];
            var action = (param) => {
                if (param.isDirectory() === false) {
                    fileData.push(...param.writableChunk()); // Append data to output
                }
            };
            return this.iterateDiskChain(filename, action) === true ? fileData : null; // Functional programming is cool
        }
        writeFileToDisk(filename, file) {
            var directoryLocation = this.locationForFilename(filename);
            if (directoryLocation === null) {
                _Kernel.krnTrace(`Error: file ${filename} could not be found`);
                return false;
            }
            var data = TSOS.Utils.toHexArray(file);
            return this.writeToDisk(directoryLocation, data);
        }
        removeFromDisk(filename) {
            var action = (param) => {
                param.setFree(); // Set data to unused state
            };
            return this.iterateDiskChain(filename, action) === true ? true : false; // Functional programming is cool
        }
        writeToDisk(directoryLocation, file) {
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
                var nextLocation = i + 1 < locations.length ? locations[i + 1] : new TSOS.DiskLocation(0, 0, 0); // Last location has "next" of 0:0:0
                var data = new DiskData(locations[i]);
                data.setUsed();
                data.setNextLocation(nextLocation);
                var writableChunk = file.splice(0, DISK_BLOCK_WRITABLE_SIZE);
                data.setWritableData(writableChunk);
            }
            return true;
        }
        allocateDiskSpace(size) {
            var locations = [];
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
        determineFreeLocation(searchType) {
            //todo: Update and use MBR
            var trackLocationStart; // Different search types require different start and end points
            var trackLocationEnd;
            if (searchType == LocationSearchType.DirectorySearch) {
                trackLocationStart = 0;
                trackLocationEnd = 1;
            }
            else if (searchType == LocationSearchType.FileSearch) {
                trackLocationStart = 1;
                trackLocationEnd = DISK_TRACK_COUNT;
            }
            var action = (location) => {
                var data = new DiskData(location);
                if (data.isUsed() === false) {
                    data.setUsed();
                    return data.location;
                }
                return null;
            };
            return this.iterateDisk(trackLocationStart, trackLocationEnd, action); // Functional programming is cool
        }
        locationForFilename(filename) {
            var action = (location) => {
                var data = new DiskData(location);
                if (data.location.sector === 0 && data.location.block === 0) {
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
        format(initialize = false) {
            var action = (location) => {
                if (initialize === true) {
                    _Disk.initializeBlock(location);
                }
                var data = new DiskData(location);
                data.zero();
                return null;
            };
            this.iterateDisk(0, DISK_TRACK_COUNT, action); // Functional programming is cool
            // Initialize MBR
            var MBRData = new DiskData(TSOS.DiskLocation.MBR_LOCATION);
            MBRData.setUsed();
            MBRData.setWritableData([0, 0, 1, 1, 0, 0]);
        }
        getFiles(type) {
            var files = [];
            var action = (location) => {
                var data = new DiskData(location);
                if (data.location.sector === 0 && data.location.block === 0) {
                    return null;
                }
                if (data.isUsed() === false) {
                    return null; // Block is unused; skip
                }
                var directoryData = this.parseFileDirectoryData(data.writableChunk());
                if (type === LSType.Normal) {
                    if (!directoryData[0].startsWith(DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX) &&
                        !directoryData[0].startsWith(DeviceDriverDisk.DEVICE_DRIVER_DISK_HIDDEN_FILE_PREFIX)) {
                        files.push(directoryData[0]);
                    }
                }
                else if (type === LSType.Long) {
                    files.push(directoryData.join(" "));
                }
                return null;
            };
            this.iterateDisk(0, 1, action); // Functional programming is cool
            return files;
        }
        parseFileDirectoryData(data) {
            var directoryData = TSOS.Utils.fromHexArray(data).split(DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX);
            if (directoryData.length === 3) {
                return [directoryData[0], directoryData[1], directoryData[2]];
            }
            else {
                var date = new Date(Date.now()).toLocaleString();
                return [directoryData.join(""), "0", date];
            }
        }
        createFileDirectoryData(filename, size, date) {
            var newDirectoryData = filename + DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX +
                size + DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX + date;
            return TSOS.Utils.toHexArray(newDirectoryData);
        }
    }
    DeviceDriverDisk.DEVICE_DRIVER_DISK_WRITE_PROGRAM = 1;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_READ_PROGRAM = 2;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_DELETE_PROGRAM = 3;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_CREATE_FILE = 4;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_READ_FILE = 5;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_WRITE_FILE = 6;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_DELETE_FILE = 7;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_FORMAT = 8;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_LS = 9;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX = "~";
    DeviceDriverDisk.DEVICE_DRIVER_DISK_HIDDEN_FILE_PREFIX = ".";
    DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX = String.fromCharCode(31); // ASCII unit separator
    DeviceDriverDisk.DEVICE_DRIVER_DISK_MAX_FILENAME_SIZE = 32;
    TSOS.DeviceDriverDisk = DeviceDriverDisk;
})(TSOS || (TSOS = {}));
