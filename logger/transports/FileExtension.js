/* eslint-disable */
const { transports: { File } } = require('winston');
const diagnostics = require('diagnostics');
const debug = diagnostics('winston:file');
const { MESSAGE } = require('triple-beam');
const moment = require('moment');

const regex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

class FileExtension extends File {

    constructor(opts) {
        super(opts);
    }

    log(info, callback = () => {}) {
        // Remark: (jcrugzz) What is necessary about this callback(null, true) now
        // when thinking about 3.x? Should silent be handled in the base
        // TransportStream _write method?
        if (this.silent) {
            callback();
            return true;
        }
    
        // Output stream buffer is full and has asked us to wait for the drain event
        if (this._drain) {
            this._stream.once('drain', () => {
                this._drain = false;
                this.log(info, callback);
            });
            return;
        }
        if (this._rotate) {
            this._stream.once('rotate', () => {
                this._rotate = false;
                this.log(info, callback);
            });
            return;
        }
    
        // Grab the raw string and append the expected EOL.
        const output = `${info[MESSAGE]}${this.eol}`.replace(regex, '');
        const bytes = Buffer.byteLength(output);
    
        // After we have written to the PassThrough check to see if we need
        // to rotate to the next file.
        //
        // Remark: This gets called too early and does not depict when data
        // has been actually flushed to disk.
        function logged() {
            this._size += bytes;
            this._pendingSize -= bytes;
    
            debug('logged %s %s', this._size, output);
            this.emit('logged', info);
    
            // Do not attempt to rotate files while opening
            if (this._opening) {
                return;
            }
    
            // Check to see if we need to end the stream and create a new one.
            if (!this._needsNewFile()) {
                return;
            }
    
            // End the current stream, ensure it flushes and create a new one.
            // This could potentially be optimized to not run a stat call but its
            // the safest way since we are supporting `maxFiles`.
            this._rotate = true;
            this._endStream(() => this._rotateFile());
        }
    
        // Keep track of the pending bytes being written while files are opening
        // in order to properly rotate the PassThrough this._stream when the file
        // eventually does open.
        this._pendingSize += bytes;
        if (this._opening
          && !this.rotatedWhileOpening
          && this._needsNewFile(this._size + this._pendingSize)) {
            this.rotatedWhileOpening = true;
        }
    
        const written = this._stream.write(output, logged.bind(this));
        if (!written) {
            this._drain = true;
            this._stream.once('drain', () => {
                this._drain = false;
                callback();
            });
        } else {
            callback(); // eslint-disable-line callback-return
        }
    
        debug('written', written, this._drain);
    
        this.finishIfEnding();
    
        return written;
    }

    get date() {
        return moment().format("MM-DD-YYYY hh:mm:ss");
    }

}

const Constants = {
    Colors: {
        error: 'red',
        warn: 'yellow',
        info: 'blue',
        verbose: 'cyan',
        debug: 'magenta',
        silly: 'magentaBright'
    }
};

module.exports = FileExtension;