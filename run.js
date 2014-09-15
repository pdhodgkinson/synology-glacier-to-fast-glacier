var stfg = require('./lib/synologyToFastGlacier'),
    argv = require('minimist')(process.argv.slice(2)),
    path = require('path'),
    _ = require('underscore'),
    vaultArg = 'vault',
    dbArg = 'db',
    outArg = 'out';



var fastGlacierCache = argv[vaultArg],
    diskstationDb = argv[dbArg],
    outputFile = argv[outArg];

if (_.isUndefined(fastGlacierCache)) {
    console.log('Required argument: --' + vaultArg + ' <FastGlacier_Archive_Cache>');
    process.exit(1);
}
if (_.isUndefined(diskstationDb)) {
    console.log('Required argument: --' + dbArg + ' <DiskStation_Glacier_DB>');
    process.exit(1);
}
if (_.isUndefined(outputFile)) {
    outputFile = fastGlacierCache + '.new';
}

console.log('Reading from FastGlacier Vault Archive: ' + fastGlacierCache);
console.log('Reading from Diskstation Glacier Database: ' + diskstationDb);
console.log('Writing to new FastGlacier Vault Archive: ' + outputFile);

stfg(fastGlacierCache, diskstationDb, { out: outputFile },
    function(err) {
        'use strict';
        if (err) {
            console.log(err);
        }
    }).then(function () {
        'use strict';
        console.log('Finished successfully');
        console.log('New FastGlacier Vault Archive located at: ' + outputFile)
    }, function (err) {
        'use strict';
        if (err) {
            console.log('Error during processing');
            console.log(err);
        }
    }, function(value) {
        'use strict';
        if (value % 5000 === 0) {
            console.log('Processed ' + value + ' records.');
        }
    });