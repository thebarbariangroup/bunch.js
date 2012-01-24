// A test suite describing Bunch CLI

// Dependencies
var path = require( 'path' ),
	fs = require( 'fs' ),
	assert = require( 'assert' ),
	util = require( 'util' ),
	vows = require( 'vows' ),
	wrench = require( 'wrench' ),
	assert = require('assert'),
	CLI = require( '../lib/bunch' ).CLI,
	helper = require( './test_helper' ).TestHelper();

var stdout = [],
	initDir = process.cwd(),
	testDir = 'tmp/cli',
	cli = new CLI( { 'msg': function( text ) {
		stdout.push( text );
	} } );

vows
	.describe( 'CLI' )
	.addBatch( {
		'change the current working directory' : function() {
			wrench.mkdirSyncRecursive( testDir, '0755' );
			process.chdir( testDir );
		}
	} )
	.addBatch( {
		'init': {
			'topic': function() {
				stdout = [];
				cli.process( ['init'], this.callback );
			},
			'should write out a Bunchfile': function( e, resp ) {
				expects = [ 'Wrote file Bunchfile to ' + process.cwd() ];
				assert.equal( stdout.join('\n'), expects.join('\n') );
			},
			'unless it aleady exists': {
				'topic': function() {
					stdout = [];
					cli.process( ['init'], this.callback );
				},
				'then it should err': function( e, resp ) {
					expects = [ 'Looks like you already have a Bunchfile.' ];
					assert.equal( stdout.join('/n'), expects.join('/n') );
				},
				'and render our test files': function( ) {
					helper.newSetupSync( 'Bunchfile' );
					assert.doesNotThrow( function () {
						fs.lstatSync( 'js/src/app.js' );
						fs.lstatSync( 'css/src/app.css' );
					}, Error );
				}
			}
		},
	} )
	.addBatch( {
		'version': {
			'topic': function() {
				stdout = [];
				cli.process( ['-v'] );
				return stdout;
			},
			'Should equal what is in Bunch.Version': function( stdout ) {
				assert.equal( stdout.join('/n'), 'bunch 0.4.0' );
			}
		},
		'help': {
			'topic': function() {
				stdout = [];
				cli.process( ['-h'] );
				return stdout;
			}, 
			'Should tell me all the commands': function( stdout ) {
				expects = [ 'Commands:', '  bunch help', '  bunch init', '  bunch monitor', '  bunch pack'];
				assert.equal( stdout.join('/n'), expects.join('/n') );
			}
		}
	} )
	.addBatch( {
		'pack': {
			'topic': function() {
				stdout = [];
				cli.process( ['pack'], this.callback );
			},
			'Should tell me which files were built': function( e, resp ) {
				var expects = [ 'Wrote file js/bin/example_base.js', 'Wrote file css/bin/example_base.css' ];
				assert.include( stdout, expects[0] );
				assert.include( stdout, expects[1] );
			}
		}
	} )
	.addBatch( {
		'change the current working directory' : function() {
			process.chdir( initDir );
			wrench.rmdirSyncRecursive( testDir );
		}
	} )
	.export( module );