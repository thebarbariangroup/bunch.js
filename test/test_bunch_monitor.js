// A test suite describing Bunch Monitor

// Dependencies
var path = require( 'path' ),
	fs = require( 'fs' ),
	assert = require( 'assert' ),
	util = require( 'util' ),
	events = require( 'events' ),
	vows = require( 'vows' ),
	wrench = require( 'wrench' ),
	assert = require('assert'),
	bunch = require( '../lib/bunch' ),
	monitor = bunch.Monitor,
	helper = require( './test_helper' ).TestHelper();

var output = [],
	initDir = process.cwd(),
	testDir = 'tmp/monitor',
	monitor = new monitor(  ),
	reporter = {
		report: function( msg ) {
			output.push( msg );
		}
	};

vows
	.describe( 'Monitor' )
	.addBatch( {
		'setup' : {
			'topic': function() {
				wrench.mkdirSyncRecursive( testDir, '0755' );
				process.chdir( testDir );
				helper.newSetupSync( {} );
				return "";
			},
			'should setup a Bunchfile': function( ) {
				assert.doesNotThrow( function () {
					fs.lstatSync( 'Bunchfile' );
				}, Error );
			},
			'and all source files': function( ) {
				assert.doesNotThrow( function () {
					fs.lstatSync( 'js/src/app.js' );
					fs.lstatSync( 'css/src/app.css' );
				}, Error );
			},
			'but not the bundle': function() {
				assert.throws( function () {
					fs.lstatSync( 'js/bin/example_base.js' );
					fs.lstatSync( 'css/bin/example_base.css' );
				}, Error );
			}
		}
	} )
	.addBatch( {
		'starting monitor': {
			'after start': {
				'topic': function() {
					var promise = new events.EventEmitter();
					monitor.on( 'afterRegenerate', function( res ) {
						promise.emit( 'success', res );
					} );
					monitor.startMonitor( 'Bunchfile', reporter );
					return promise;
				},
				'should build all bundles on start': function( err, file ) {
					assert.doesNotThrow( function () {
						fs.lstatSync( 'js/bin/example_base.js' );
						fs.lstatSync( 'css/bin/example_base.css' );
					}, Error );
				}
			}
		}
	} )
	.addBatch( {
		'while monitor runs': {
			'and a source files changes': {
				topic: function() {
					var promise = new events.EventEmitter(),
						lastModifiedAt = fs.lstatSync( 'css/bin/example_base.css' ).mtime;
					monitor.on( 'afterRegenerate', function( res ) {
						promise.emit( 'success', lastModifiedAt );
					} );
					setTimeout( function() {
						fs.open( 'css/src/app.css', 'a', 666, function( e, id ) {
							fs.write( id, '\n .append-test {\n\tcolor: red;\n}', null, 'utf8', function(){
								fs.close( id );
							} );
						} );
					}, 2000 );
					return promise;
				},
				'it should rebuild the bundle that the source file is in': function( lastModifiedAt ) {
					var stat1 = fs.lstatSync( 'js/bin/example_base.js' ),
						stat2 = fs.lstatSync( 'css/bin/example_base.css' );
					assert.isTrue( stat2.mtime > lastModifiedAt );
					assert.isTrue( stat2.mtime > stat1.mtime );
				}
			},
			'and an error is introduced to CSS': {
				topic: function() {
					var promise = new events.EventEmitter(),
						lastModifiedAt = fs.lstatSync( 'css/bin/example_base.css' ).mtime;
					monitor.on( 'afterRegenerate', function( res ) {
						promise.emit( 'success', lastModifiedAt );
					} );
					setTimeout( function() {
						fs.open( 'css/src/app.css', 'a', 666, function( e, id ) {
							fs.write( id, '\n .append-test {\n\tcolor: @undefinedVar;\n}', null, 'utf8', function(){
								fs.close( id );
							} );
						} );
					}, 2000 );
					return promise;
				},
				'it should log an error to the built file': function( lastModifiedAt ) {
					var stat1 = fs.lstatSync( 'css/bin/example_base.css' ),
						output = fs.readFileSync( 'css/bin/example_base.css', 'utf-8');
					console.log( "output", output );
					assert.isTrue( stat1.mtime > lastModifiedAt );
				}
			}
		}
	} )
	.addBatch( {
		'cleanup' : function() {
			process.chdir( initDir );
			wrench.rmdirSyncRecursive( testDir );
		}
	} )
	.export( module );