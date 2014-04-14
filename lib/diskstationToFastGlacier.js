var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Q = require('q'),
    sqllite = require('sqlite3').verbose(),
    moment = require('moment'),    
    dataFormat = '<m><v>2</v><p>%s</p><lm>%s</lm></m>', 
    fastGlacierDateFormat = 'YYYYMMDD[T]HHmmss[Z]';

function diskstationToFastGlacier(fastGlacierCacheFile, diskstationDb, options,
                                  callback) {
    if (options.out === undefined) {
        options.out = fastGlacierCacheFile + '.new'; //write to new file for output
    }
    
    var deferred = Q.defer();

    var db = new sqllite.Database(diskstationDb, sqllite.OPEN_READWRITE, function(err) {
        if (err !== null) {
            deferred.reject(err)
        } else {
            fs.readFile(fastGlacierCacheFile, {}, function (err, data) {
                if (err !== null) {
                    deferred.reject(err);
                } else {
                    var json = JSON.parse(data),
                        selectArchiveId = db.prepare('select shareName, basePath from file_info_tb where' +
                            ' archiveID = ?'),
                        defferedAr = [],
                        count = 0;

                    json.ArchiveList.forEach(function (data, i) {
                        //key|shareName|basePath|archiveID|lastBkpTime|fileSize|archiveVersion|current
                        var rowDeferred = Q.defer();
                        defferedAr.push(rowDeferred.promise);
                        selectArchiveId.get(data.ArchiveId, function (err, row) {
                            if (err !== null) {
                                rowDeferred.reject(err);
                            }
                            var thePath = path.join(row.shareName, row.basePath),
                                base64 = new Buffer(thePath).toString('base64'),
                                date = moment(data.CreationDate).format(fastGlacierDateFormat);

                            data.ArchiveDescription = util.format(dataFormat, base64, date);
                            json.ArchiveList[i] = data;
                            rowDeferred.resolve(data);

                        });  
                    });
                    
                    Q.all(defferedAr).then(function() {
                        fs.writeFile(options.out, JSON.stringify(json, null, 2), {},  //todo remove formating
                            function (err) {
                                if(err !== null) {
                                    deferred.reject(err);
                                } else {
                                    //All done
                                    deferred.resolve();
                                }
                            }
                        );
                    }, function(err) {
                        deferred.reject(err);
                    })
                }
            });
        }
    });

    deferred.promise.finally(function () {
        db.close();
    }).done(function() {
        callback(null);
    }, function(err) {
        callback(err);
    });

    return deferred.promise;
};

module.exports = diskstationToFastGlacier;