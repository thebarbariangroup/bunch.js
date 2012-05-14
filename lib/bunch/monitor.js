var path = require( 'path' ),
	fs = require( 'fs' ),
	sys = require( 'util' ),
	events = require( 'events' ),
	packager = require( './packager' ).Packager,
	bunch = exports;
	
	
bunch.Monitor = function( options ){
	var settings = {}, // private protected settings
		publicFunc = {}, // public functions
		privateFun = {}; // internal functions
	
	settings = {
		bunchPath: process.cwd(),
		lastBuild: 0,
		files: {}
	};
	
	defaults = { 
		timeout: 1000
	};
	
	options = options || {};
	
	for ( var d in defaults ) {
		if ( !( d in options ) ) { 
			options[d] = defaults[d];
		}
	}
	
	settings.ee = new events.EventEmitter();
	
	privateFunc = {
		'init': function() {
			privateFunc.buildFileList();
			privateFunc.regenerate();
			setTimeout( publicFunc.checkFiles, options.timeout );
		},
		'buildFileList': function() {
			var fileName;
			// load the config
			settings.packer.loadConfigSync( settings.configFile );
			// add all our source files
			settings.files = settings.packer.getFiles();
			// then add our config file
			settings.files[settings.configFile] = {
				'bundles': ['*']
			};
			// and set some timestamps
			for ( fileName in settings.files ) {
				if ( settings.files.hasOwnProperty( fileName ) ) {
					settings.files[fileName].lastModified = Date.parse( fs.statSync( fileName ).mtime );
				}
			}
		},
		'regenerate': function( bundles, callback ) {
			var options = { 'monitor': true };
			if ( typeof( bundles ) != 'undefined' ) options.bundles = bundles;
			// update our time stamp
			settings.packer.pack( options, function( err, files ) {
				settings.lastBuild = ( new Date() ).getTime();
				for( var i = 0; i < files.length; i++ ) {
					settings.reporter.report( 'Wrote file ' + files[i] );
				}
				settings.ee.emit( 'afterRegenerate', settings );
				if ( callback ) callback();
			} );
		}
	};
	
	publicFunc = {
		'startMonitor': function( configFile, reporter ) {
			reporter.report( '== Bunch Monitor started' );
			reporter.report( '>> Checking for file changes every ' + ( options.timeout / 1000 ) + ' second(s)' );
			reporter.report( '>> CTRL+C to stop' );
			
			settings.configFile = configFile;
			settings.reporter = reporter;
			settings.packer = packager();
			
			privateFunc.init();
			settings.ee.emit( 'monitorStarted' );
		},
		'stopMonitor': function( ) {
			process.exit();
		},
		'checkFiles': function() {
			var filesChecked = [],
				dirsChecked = [],
				reporter = settings.reporter,
				afterRegenerate = function( ) {
					reporter.report( 'Done.' );
					setTimeout( publicFunc.checkFiles, options.timeout );
				};
			for( var file in settings.files ) {
				if( settings.files.hasOwnProperty( file ) ) {
					var mtime = Date.parse( fs.statSync( file ).mtime );
					if ( mtime > settings.lastBuild ) {
						settings.ee.emit( 'fileChanged', file );
						if ( file.match( /Bunchfile$/ ) ) {
							// if the Bunchfile file changed, reload our config
							reporter.report( 'Bunchfile File Changed.' );
							reporter.report( 'Reloading Manifest...' );
							privateFunc.buildFileList();
							reporter.report( 'Rebuilding all bundles...' );
							privateFunc.regenerate( null, afterRegenerate );
						} else {
							// otherwise, just log the file that changed
							reporter.report( 'File Changed -> ' + file );
							reporter.report( 'Rebuilding bundles: ' + settings.files[file].bundles.join( ',' ) );
							privateFunc.regenerate( settings.files[file].bundles, afterRegenerate );
						}
						return true;
					}
				}
			}
			setTimeout( publicFunc.checkFiles, options.timeout );
		},
		'on': function( event, callback ) {
			return settings.ee.on( event, callback );
		},
		'once': function( event, callback ) {
			return settings.ee.once( event, callback );
		}
	};
	
	publicFunc.emit = settings.ee.emit;
	
	return publicFunc;
};