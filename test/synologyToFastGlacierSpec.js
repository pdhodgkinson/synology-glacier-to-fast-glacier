var expect = require('chai').expect,
    path = require('path'),
    dtfg = require('../lib/diskstationToFastGlacier');

describe('diskstationToFastGlacierSpec', function () {
    'use strict';
    describe('diskstationToFastGlacier', function () {
        var sampleFastGlacierCache = '../samples/f467a0d5-5e80-4022-ba85-b7f6ff444a08/' +
                '40e6b1e9b38966c6b88b1d261a86e80e',
            diskstationDb = '../samples/My Glacier Backup Set 1.mapping.db';
        
        it('should write to a new output file by default', function(done) {
            dtfg(path.join(__dirname, sampleFastGlacierCache),
                path.join(__dirname, diskstationDb), 
                {}, 
                done);
        });
    });
});