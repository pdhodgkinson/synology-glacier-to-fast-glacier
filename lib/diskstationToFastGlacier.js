var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Q = require('q'),
    _ = require('underscore'),
    sqllite = require('sqlite3').verbose(),
    moment = require('moment'),
    JSONStream = require('JSONStream'),
    es = require('event-stream'),
    dataFormat = '<m><v>2</v><p>%s</p><lm>%s</lm></m>',
    fastGlacierDateFormat = 'YYYYMMDD[T]HHmmss[Z]';

function wrapError(deferred, callback) {
    'use strict';
    return function (reason) {
        deferred.reject(reason);
        if (_.isFunction(callback)) {
            callback(reason);
        }
    };
}

var diskstationToFastGlacier = function(fastGlacierCacheFile, diskstationDb, options,
                                  callback) {
    'use strict';
    if (_.isUndefined(options)) {
        options = {};
    }
    if (_.isUndefined(options.out) === false) {
        options.out = fastGlacierCacheFile + '.new'; //write to new file for output
    }


    var fd = fs.openSync(fastGlacierCacheFile, 'r'),
        stats = fs.fstatSync(fd),
        totalSize=stats.size,
        chunkSize=512,
        buffer = null,
        totalBytesRead = 0,
        prefix = null,
        combinedBuffer = '',
        targetString = '"ArchiveList":',
        targetStringIndex = -1,
        bytesRead = 0,
        deferred = Q.defer(),
        handleError = wrapError(deferred, callback);

    /**
     * Read enough of the start of the file to capture the initial set of data, before
     * the ArchiveList. This will not change in the output
     */
    while (prefix === null && totalBytesRead < totalSize) {
        if ((totalBytesRead + chunkSize) > totalSize) {
            chunkSize = (totalSize - totalBytesRead);
        }
        buffer = new Buffer(chunkSize);
        bytesRead = fs.readSync(fd, buffer, 0, chunkSize, totalBytesRead);
        if (bytesRead === 0) {
            handleError('EOF. No matching prefix found');
            return deferred.promise;
        }
        totalBytesRead += bytesRead;
        combinedBuffer += buffer.toString('utf8');
        targetStringIndex = combinedBuffer.indexOf(targetString);
        if (targetStringIndex !== -1) {
            prefix = combinedBuffer.substring(0, targetStringIndex + targetString.length);
        }
    }
    fs.close(fd);

    /**
     * Stream parsed JSON output to output file
     */
    var outstream = fs.createWriteStream(options.out);
    var db = new sqllite.Database(diskstationDb, sqllite.OPEN_READWRITE, function(err) {
        if (err !== null) {
            handleError(err);
        } else {
            //Create an index on the archiveID field for quicker lookup
            db.run(
                'CREATE INDEX IF NOT EXISTS file_info_tb_archiveID_idx ON file_info_tb(archiveID)',
                function (err) {
                    if (err !== null) {
                        handleError(err);
                    } else {
                        var selectArchiveIdQuery = db.prepare('select shareName, basePath from' +
                                ' file_info_tb where' +
                                ' archiveID = ?'),
                            count = 0;
                        outstream.write(prefix, 'utf8', function () {
                            var readStream = fs.createReadStream(fastGlacierCacheFile);
                            readStream.pipe(JSONStream.parse('ArchiveList.*'))
                                .pipe(es.map(function (data, callback) {
                                    selectArchiveIdQuery.get(data.ArchiveId, function (err, row) {
                                        if (err !== null) {
                                            callback(err);
                                        } else {
                                            var thePath = path.join(row.shareName, row.basePath),
                                                base64 = new Buffer(thePath).toString('base64'),
                                                date = moment(data.CreationDate)
                                                    .format(fastGlacierDateFormat);

                                            data.ArchiveDescription = util
                                                .format(dataFormat, base64, date);
                                            count++;
                                            deferred.notify(count);
                                            callback(null, data);

                                        }
                                    });
                                }))
                                .pipe(JSONStream.stringify('[\n', ',\n', '\n]\n'))
                                .pipe(outstream);

                            outstream.on('finish', function () {
                                fs.appendFile(options.out, '}', function (err) {
                                    if (err !== null) {
                                        handleError(err);
                                    } else {
                                        deferred.resolve();
                                    }

                                });

                                selectArchiveIdQuery.finalize(function () {
                                    db.close();
                                });

                            });

                        });
                    }
                });
        }
    });
    
    return deferred.promise;
};

module.exports = diskstationToFastGlacier;