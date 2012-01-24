// A test suite describing Bunch Packager

// Dependencies
var path = require( 'path' ),
	fs = require( 'fs' ),
	assert = require( 'assert' ),
	util = require( 'util' ),
	vows = require( 'vows' ),
	wrench = require( 'wrench' ),
	assert = require('assert'),
	packager = require( '../lib/bunch' ).Packager,
	helper = require( './test_helper' ).TestHelper(),
	testDir = 'tmp/packager',
	initDir = process.cwd(),
	testConfig = {
		"jsDir": "tmp/test_files/js",
		"cssDir": "tmp/test_files/css",
		"bundles": {
			"example_base.js": [
				"jquery.js",
				"app.js"
			],
			"example_base.css": [
				"reset.css",
				"app.css"
			]
		}
	},
	output = [],
	reporter = {
		report: function( ) {
			var i = 0, l = arguments.length;
			for (; i < l; i++ ) {
				output.push( arguments[i] );
			}
		}
	};
	
	
vows
	.describe( 'Packager' )
	.addBatch( {
		'setup': function() {
			wrench.mkdirSyncRecursive( testDir, '0755' );
			process.chdir( testDir );
			packer = packager();
			packer.setReporter( reporter );
			packer.loadConfig( testConfig );
			helper.newSetupSync( packer.toJSON() );
		}
	} )
	.addBatch( {
		'config': {
			'Should have successfully loaded our config': function( ) {
				var fileList = [ 'tmp/test_files/js/src/jquery.js', 'tmp/test_files/js/src/app.js', 'tmp/test_files/css/src/reset.css', 'tmp/test_files/css/src/app.css' ];
				assert.equal( packer.getFileList(), fileList.toString() );
				assert.equal( packer.toJSON(), testConfig.toString() );
			}
		}
	} )
	.addBatch( {
		'packing with compression': {
			'topic': function() {
				// Test.fn.resetBuildSync( packer );
				packer.pack( { compress: true }, this.callback );
			},
			'builds the files': function( e, resp ) {
				// check that the built files exist
				assert.doesNotThrow(function () {
					fs.lstatSync( 'tmp/test_files/js/bin/example_base.js' );
					fs.lstatSync( 'tmp/test_files/css/bin/example_base.css' );
				}, Error);
			},
			'return a list of files': function( e, resp ) {
				var expects = ['tmp/test_files/css/bin/example_base.css', 'tmp/test_files/js/bin/example_base.js'];
				assert.include( resp, expects[0] );
				assert.include( resp, expects[1] );
			},
			'the files should be compressed': function( e, resp ) {
			}
		}
	} )
	.addBatch( {
		'packing without compression': {
			'topic': function() {
				packer.pack( { compress: false }, this.callback );
			},
			'builds the files': function( e, resp ) {
				// check that the built files exist
				assert.doesNotThrow(function () {
					fs.lstatSync( 'tmp/test_files/js/bin/example_base.js' );
					fs.lstatSync( 'tmp/test_files/css/bin/example_base.css' );
				}, Error);
			},
			'return a list of files': function( e, resp ) {
				var expects = ['tmp/test_files/css/bin/example_base.css', 'tmp/test_files/js/bin/example_base.js'];
				assert.include( resp, expects[0] );
				assert.include( resp, expects[1] );
			},
			'the files should not be compressed': function( e, resp ) {
				
			}
		}
	} )
	.addBatch( {
		'js error handling': {
			'topic': function() {
				helper.resetBuildSync( packer );
				output = [];
				// screw up a js file
				fileContents = "i am not valid javascript;] {{";
				fs.writeFileSync( 'tmp/test_files/js/src/app.js', fileContents );
				// then pack with compression
				packer.pack( { compress: true }, this.callback );
			},
			'should notify of errors and unbuilt files': function( e, resp ) {
				var files = ['tmp/test_files/css/bin/example_base.css', 'tmp/test_files/js/bin/example_base.js'];
				assert.equal( resp.indexOf( files[1] ), -1 );
				assert.include( resp, files[0] );
				assert.include( output, 'Failed to build bundle: ');
				assert.include( output, files[1] );
				assert.include( output, 'Error' );
			}
		}
	} )
	.addBatch( {
		'css error handling': {
			'with compression': {
				'topic': function() {
					helper.resetBuildSync( packer );
					output = [];
					// screw up a css file
					fileContents = ".test-1 { width: 1px\n color: red }\n.test-1:after { content: \"app.css\"; }";
					fs.writeFileSync( 'tmp/test_files/css/src/app.css', fileContents );
					// FIXME: I can't sort out to get YUI to bomb without making less bomb first.
					//  there may be an untested edge case where Less will render the css without problem but YUI will err.
					// then pack with compression to test Less and YUI
					packer.pack( { compress: true }, this.callback );
				},
				'should notify of errors and unbuilt files': function( e, resp ) {
					var expects = ['tmp/test_files/js/bin/example_base.js'];
					assert.equal( resp, expects.toString() );
					assert.include( output, 'Failed to build bundle: ');
					assert.include( output, 'tmp/test_files/css/bin/example_base.css' );
					assert.include( output, 'Syntax Error on line 3' );
				}, 
				'without compression': {
					'topic': function( e, resp ) {
						output = [];
						// then pack without compression to test Less
						packer.pack( { compress: false }, this.callback );
					}, 
					'should notify of errors and unbuilt files': function( e, resp ) {
						var expects = ['tmp/test_files/js/bin/example_base.js'];
						assert.include( resp, expects[0] );
						assert.include( output, 'Failed to build bundle: ');
						assert.include( output, 'tmp/test_files/css/bin/example_base.css' );
						assert.include( output, 'Syntax Error on line 3' );
					}
				}
			}

		}
	} )
	.addBatch( {
		'cleanup': function( ) {
			process.chdir( initDir );
			wrench.rmdirSyncRecursive( testDir );
		}
	} )
	.export( module );