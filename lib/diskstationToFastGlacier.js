var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Q = require('q'),
    sqllite = require('sqlite3').verbose(),
    moment = require('moment'),
    winston = require('winston'),
    JSONStream = require('JSONStream'),
    es = require("event-stream"),
    dataFormat = '<m><v>2</v><p>%s</p><lm>%s</lm></m>',
    fastGlacierDateFormat = 'YYYYMMDD[T]HHmmss[Z]';

function diskstationToFastGlacier(fastGlacierCacheFile, diskstationDb, options,
                                  callback) {
    if (options.out === undefined) {
        options.out = fastGlacierCacheFile + '.new'; //write to new file for output
    }


    var fd = fs.openSync(fastGlacierCacheFile, 'r');
    var stats = fs.fstatSync(fd);
//            var bufferSize=stats.size,
    var totalSize=stats.size,
        chunkSize=512,
        buffer = null,
        totalBytesRead = 0,
        prefix = null,
        combinedBuffer = '';
    targetString = '"ArchiveList":',
        targetStringIndex = -1,
        bytesRead = 0;


    console.log('starting reading');
    while (prefix === null && totalBytesRead < totalSize) {
        if ((totalBytesRead + chunkSize) > totalSize) {
            chunkSize = (totalSize - totalBytesRead);
        }
        buffer = new Buffer(chunkSize)
        bytesRead = fs.readSync(fd, buffer, 0, chunkSize, totalBytesRead);
        if (bytesRead === 0) {
            throw 'EOF. Match String not found';
        }
        totalBytesRead += bytesRead;
        combinedBuffer += buffer.toString('utf8');
        targetStringIndex = combinedBuffer.indexOf(targetString);
        if (targetStringIndex !== -1) {
            prefix = combinedBuffer.substring(0, targetStringIndex + targetString.length);
        }
    }
    console.log('prefix is: ' + prefix);
    fs.close(fd);

    var deferred = Q.defer(),
        outstream = fs.createWriteStream(options.out);


    var db = new sqllite.Database(diskstationDb, sqllite.OPEN_READWRITE, function(err) {
        if (err !== null) {
            deferred.reject(err)
        } else {
            db.run('CREATE INDEX IF NOT EXISTS file_info_tb_archiveID_idx ON file_info_tb(archiveID)', function (err) {
                winston.profile('readtotal');
                winston.profile('writetotal');
                winston.profile('chunk');
                winston.profile('chunkIn');
                winston.profile('chunkOut');
                winston.profile('query');
                var count = 0,
                    jsonIncount = 0,
                    queryCount = 0,
                    jsonOutCount = 0,
                    selectArchiveIdQuery = db.prepare('select shareName, basePath from file_info_tb where' +
                        ' archiveID = ?');
                outstream.write(prefix, 'utf8', function () {
                    var readStream = fs.createReadStream(fastGlacierCacheFile);
                    readStream.pipe(JSONStream.parse('ArchiveList.*'))
                        .pipe(es.map(function(data, callback) {
                            //winston.log(data);
                            count = count + 1;
                            if (count % 5000 == 0) {
                                winston.log('info', 'Completed %d row', count);
                                winston.profile('chunk');
                                winston.profile('chunk');
                            }


                            selectArchiveIdQuery.get(data.ArchiveId, function (err, row) {
                                if (err !== null) {
//                            rowDeferred.reject(err);
                                    callback(err);
                                }
                                var thePath = path.join(row.shareName, row.basePath),
                                    base64 = new Buffer(thePath).toString('base64'),
                                    date = moment(data.CreationDate).format(fastGlacierDateFormat);

                                data.ArchiveDescription = util.format(dataFormat, base64, date);
                                queryCount += 1;
                                if (queryCount % 5000 == 0) {
                                    winston.log('info', 'Completed %d queries', queryCount);
                                    winston.profile('query');
                                    winston.profile('query');
                                }
                                callback(null, data);


                                //rowDeferred.resolve(data);
                            });
                        }))
                        .pipe(es.mapSync(function(data) {
                            jsonIncount = jsonIncount + 1;
                            if (jsonIncount % 5000 == 0) {
                                winston.log('info', 'Completed %d row', jsonIncount);
                                winston.profile('chunkIn');
                                winston.profile('chunkIn');
                            }
                            return data;
                        }))
                        .pipe(JSONStream.stringify('[\n', ',\n', '\n]\n'))
                        .pipe(es.mapSync(function(data) {
                            jsonOutCount = jsonOutCount + 1;
                            if (jsonOutCount % 5000 == 0) {
                                winston.log('info', 'Completed %d row', jsonOutCount);
                                winston.profile('chunkOut');
                                winston.profile('chunkOut');
                            }
                            return data;
                        }))
                        .pipe(outstream);

                    outstream.on('finish', function () {
                        winston.log('info', 'out stream finished');
                        winston.profile('writetotal');
                        fs.appendFile(options.out, '}', function (err) {
                            if (err !== null) {
                                throw err;
                            }
                        });

                        selectArchiveIdQuery.finalize(function () {
                            winston.log('info', 'Closing DB');
                            db.close();
                        });

                    });

                    readStream.on('close', function () {
                        winston.log('info', 'Number of rows processed: %d', count);
                        winston.profile('readtotal');
                        //db.close();
                    });
                });
            });

        }
    });

};

module.exports = diskstationToFastGlacier;