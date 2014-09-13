var stfg = require('./lib/synologyToFastGlacier'),
    path = require('path');

var sampleFastGlacierCache = './samples/f467a0d5-5e80-4022-ba85-b7f6ff444a08/' +
        '40e6b1e9b38966c6b88b1d261a86e80e',
    diskstationDb = './samples/My Glacier Backup Set 1.mapping.db';



stfg(path.join(__dirname, sampleFastGlacierCache), path.join(__dirname, diskstationDb), {},
    function(err) {
        'use strict';
        if (err) {
            console.log(err);
        }
    }).then(function () {
        'use strict';
        console.log('Finished successfully');
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