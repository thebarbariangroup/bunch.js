// Dependencies
var path = require( 'path' ),
	fs = require( 'fs' ),
	yui = require( 'yui-compressor' ),
	less = require( 'less' );

var bunch = {
	version: require( './bunch/version' ).version,
	Packager: require( './bunch/packager' ).Packager,
	CLI: require( './bunch/cli' ).CLI,
	Monitor: require( './bunch/monitor' ).Monitor
};

for( var k in bunch ) {
	exports[k] = bunch[k];
}

CLI = bunch.CLI();
CLI.process( process.argv.slice( 2 ) );