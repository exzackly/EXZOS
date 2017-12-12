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
        setMBRNextDirectoryLocation(location) {
            this.data[4] = location.track; // Fourth byte indicates next free track
            this.data[5] = location.sector; // Fifth byte indicates next free sector
            this.data[6] = location.block; // Sixth byte indicates next free block
            this.updateDisk();
        }
        MBRNextDirectoryLocation() {
            if (this.data[4] === 0 && this.data[5] === 0 && this.data[6] === 0) {
                return null;
            }
            return new TSOS.DiskLocation(this.data[4], this.data[5], this.data[6]);
        }
        setMBRNextFileLocation(location) {
            this.data[7] = location.track; // Seventh byte indicates next free track
            this.data[8] = location.sector; // Eighth byte indicates next free sector
            this.data[9] = location.block; // Ninth byte indicates next free block
            this.updateDisk();
        }
        MBRNextFileLocation() {
            if (this.data[7] === 0 && this.data[8] === 0 && this.data[9] === 0) {
                return null;
            }
            return new TSOS.DiskLocation(this.data[7], this.data[8], this.data[9]);
        }
        setWritableData(data) {
            this.data = this.data.slice(0, DISK_BLOCK_RESERVED_SIZE).concat(data); // Preserve directory chunk
            this.updateDisk();
        }
        writableChunk() {
            return this.data.slice(DISK_BLOCK_RESERVED_SIZE); // Ignore directory chunk
        }
        zero(type) {
            if (type === FormatType.Quick) {
                this.data.splice(0, DISK_BLOCK_RESERVED_SIZE, ...[0, 0, 0, 0]); /// Format directory chunk
            }
            else if (type === FormatType.Full) {
                this.data = [];
            }
            this.updateDisk();
        }
    }
    TSOS.DiskData = DiskData;
    let LocationSearchType;
    (function (LocationSearchType) {
        LocationSearchType[LocationSearchType["DirectorySearch"] = 0] = "DirectorySearch";
        LocationSearchType[LocationSearchType["FileSearch"] = 1] = "FileSearch";
    })(LocationSearchType = TSOS.LocationSearchType || (TSOS.LocationSearchType = {}));
    let FormatType;
    (function (FormatType) {
        FormatType[FormatType["Quick"] = 0] = "Quick";
        FormatType[FormatType["Full"] = 1] = "Full";
    })(FormatType = TSOS.FormatType || (TSOS.FormatType = {}));
    let LSType;
    (function (LSType) {
        LSType[LSType["Normal"] = 0] = "Normal";
        LSType[LSType["Long"] = 1] = "Long";
        LSType[LSType["Data"] = 2] = "Data";
    })(LSType = TSOS.LSType || (TSOS.LSType = {}));
    // Extends DeviceDriver
    class DeviceDriverDisk extends TSOS.DeviceDriver {
        constructor() {
            // Override the base method pointers.
            super();
            this.driverEntry = this.krnKbdDriverEntry;
            this.isr = this.krnDiskHandleRequest;
        }
        krnKbdDriverEntry() {
            // Initialization routine for this, the kernel-mode Keyboard Device Driver.
            this.status = "loaded";
            this.format(FormatType.Full, true);
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
                    this.format(params[1]);
                    _StdOut.putText("Disk successfully formatted.");
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_LS:
                    var files = this.getDirectoryFiles(params[1]);
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
                case DeviceDriverDisk.DEVICE_DRIVER_DISK_CHECK_DISK:
                    this.checkDisk();
                    _StdOut.putText("Check disk successful.");
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
            var filename = `${DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX}${pid}.swp`;
            var directoryLocation = this.createOnDisk(filename);
            if (directoryLocation === null) {
                _StdOut.putText("Insufficient memory. Please clear up memory before loading new process.");
                _StdOut.advanceLine();
                return false;
            }
            program = TSOS.Utils.trimProgramArray(program); // Trim off insignificant trailing 0s
            return this.writeToDisk(directoryLocation, program);
        }
        retrieveProgramFromDisk(pid) {
            _Kernel.krnTrace(`Roll in PID ${pid}`);
            var filename = `${DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX}${pid}.swp`;
            var process = _Scheduler.getProcessForPid(pid);
            var program = this.retrieveFromDisk(filename);
            this.removeProgramFromDisk(pid);
            if (program === null) {
                return false;
            }
            program = program.slice(0, MEMORY_SEGMENT_SIZE); // Truncate file to segment size
            TSOS.Mmu.zeroBytesWithBaseAndLimit(process.base, process.limit); // Zero memory
            TSOS.Mmu.setBytesAtLogicalAddress(0, program, process.base, process.limit); // Load program into memory segment
            return true;
        }
        removeProgramFromDisk(pid) {
            var filename = `${DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX}${pid}.swp`;
            return this.removeFromDisk(filename);
        }
        createOnDisk(filename) {
            if (filename.length > DeviceDriverDisk.DEVICE_DRIVER_DISK_MAX_FILENAME_SIZE) {
                return null; // Filename larger than max
            }
            if (this.locationForFilename(filename) !== null) {
                return null; // File with specified filename already exists
            }
            var location = this.fetchFromMBR(LocationSearchType.DirectorySearch);
            if (location === null) {
                return null; // Free directory location could not be found
            }
            var data = new DiskData(location);
            data.setUsed();
            data.setNextLocation(TSOS.DiskLocation.BLANK_LOCATION);
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
            var res = this.iterateDiskChain(filename, action) === true ? true : false; // Functional programming is cool
            // Update MBR directory and file
            this.updateMBR(LocationSearchType.DirectorySearch);
            this.updateMBR(LocationSearchType.FileSearch);
            return res;
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
                var nextLocation = i + 1 < locations.length ? locations[i + 1] : TSOS.DiskLocation.BLANK_LOCATION;
                var data = new DiskData(locations[i]);
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
                var location = this.fetchFromMBR(LocationSearchType.FileSearch);
                if (location === null) {
                    _StdOut.putText("Insufficient memory. Please clear up memory before loading new process.");
                    _StdOut.advanceLine();
                    for (var j = 0; j < locations.length; j++) {
                        var data = new DiskData(locations[j]);
                        data.setFree();
                    }
                    return null;
                }
                locations.push(location);
            }
            return locations;
        }
        fetchFromMBR(type) {
            var MBRData = new DiskData(TSOS.DiskLocation.MBR_LOCATION);
            var location;
            if (type === LocationSearchType.DirectorySearch) {
                location = MBRData.MBRNextDirectoryLocation();
            }
            else if (type === LocationSearchType.FileSearch) {
                location = MBRData.MBRNextFileLocation();
            }
            if (location !== null) {
                var data = new DiskData(location);
                data.setUsed();
                this.updateMBR(type);
                return location;
            }
            else {
                return null;
            }
        }
        updateMBR(type) {
            var trackLocationStart; // Different search types require different start and end points
            var trackLocationEnd;
            if (type == LocationSearchType.DirectorySearch) {
                trackLocationStart = 0;
                trackLocationEnd = 1;
            }
            else if (type == LocationSearchType.FileSearch) {
                trackLocationStart = 1;
                trackLocationEnd = DISK_TRACK_COUNT;
            }
            var action = (location) => {
                var data = new DiskData(location);
                if (data.isUsed() === false) {
                    return data.location;
                }
                return null;
            };
            var nextLocation = this.iterateDisk(trackLocationStart, trackLocationEnd, action); // Functional programming is cool
            if (nextLocation === null) {
                nextLocation = TSOS.DiskLocation.BLANK_LOCATION; // Next location not found; provide default
            }
            var MBRData = new DiskData(TSOS.DiskLocation.MBR_LOCATION);
            if (type === LocationSearchType.DirectorySearch) {
                MBRData.setMBRNextDirectoryLocation(nextLocation);
            }
            else if (type === LocationSearchType.FileSearch) {
                MBRData.setMBRNextFileLocation(nextLocation);
            }
            TSOS.Control.hostUpdateDisplayDisk();
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
        format(type, initialize = false) {
            var action = (location) => {
                if (initialize === true) {
                    _Disk.initializeBlock(location);
                }
                var data = new DiskData(location);
                data.zero(type);
                return null;
            };
            this.iterateDisk(0, DISK_TRACK_COUNT, action); // Functional programming is cool
            // Initialize MBR
            var MBRData = new DiskData(TSOS.DiskLocation.MBR_LOCATION);
            MBRData.setUsed();
            MBRData.setWritableData([0, 0, 1, 1, 0, 0].concat(TSOS.Utils.toHexArray(` ${APP_AUTHOR}`)));
        }
        getDirectoryFiles(type) {
            var files = [];
            var action = (location) => {
                var data = new DiskData(location);
                if (data.location.sector === 0 && data.location.block === 0) {
                    return null;
                }
                if (type !== LSType.Data && data.isUsed() === false) {
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
                else if (type === LSType.Data) {
                    if (directoryData[0] !== "") {
                        files.push(data);
                    }
                }
                return null;
            };
            this.iterateDisk(0, 1, action); // Functional programming is cool
            return files;
        }
        getDataBlocks() {
            var files = new Set(); // Use set to keep track of "visited" locations
            var action = (location) => {
                var data = new DiskData(location);
                if (data.isUsed() === true) {
                    files.add(location.key()); // Key is used to uniquely identify location
                }
                return null;
            };
            this.iterateDisk(1, DISK_TRACK_COUNT, action); // Functional programming is cool
            return files;
        }
        checkDisk() {
            var directoryBlocks = this.getDirectoryFiles(LSType.Data);
            var dataBlocks = this.getDataBlocks();
            // Restore free blocks that contain data
            for (var i = 0; i < directoryBlocks.length; i++) {
                if (directoryBlocks[i].isUsed() === false) {
                    _StdOut.putText(`Restoring ${directoryBlocks[i].location.key()}`);
                    _StdOut.advanceLine();
                    directoryBlocks[i].setUsed();
                }
                var filename = this.parseFileDirectoryData(directoryBlocks[i].writableChunk());
                var action = (param) => {
                    if (param.isUsed() === false) {
                        _StdOut.putText(`Restoring ${param.location.key()}`);
                        _StdOut.advanceLine();
                        param.setUsed();
                    }
                    dataBlocks.delete(param.location.key()); // Remove from set to "mark" location "visited"
                };
                this.iterateDiskChain(filename[0], action); // Functional programming is cool
            }
            // Reclaim unused data blocks
            dataBlocks.forEach(unusedDiskLocationKey => {
                _StdOut.putText(`Reclaiming ${unusedDiskLocationKey}`);
                _StdOut.advanceLine();
                var keyParts = unusedDiskLocationKey.split(":").map(x => parseInt(x)); // Reconstruct disk location
                var location = new TSOS.DiskLocation(keyParts[0], keyParts[1], keyParts[2]);
                var data = new DiskData(location);
                data.setFree();
            });
            this.updateMBR(LocationSearchType.FileSearch);
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
    DeviceDriverDisk.DEVICE_DRIVER_DISK_CHECK_DISK = 10;
    DeviceDriverDisk.DEVICE_DRIVER_DISK_PROGRAM_PREFIX = "~";
    DeviceDriverDisk.DEVICE_DRIVER_DISK_HIDDEN_FILE_PREFIX = ".";
    DeviceDriverDisk.DEVICE_DRIVER_DISK_SIZE_AND_DATE_INFIX = String.fromCharCode(31); // ASCII unit separator
    DeviceDriverDisk.DEVICE_DRIVER_DISK_MAX_FILENAME_SIZE = 32;
    TSOS.DeviceDriverDisk = DeviceDriverDisk;
})(TSOS || (TSOS = {}));
