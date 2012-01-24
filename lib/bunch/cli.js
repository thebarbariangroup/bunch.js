// Dependencies
var path = require( 'path' ),
	fs = require( 'fs' ),
	util = require( 'util' ),
	version = require( './version' ).version,
	packager = require( './packager' ).Packager,
	monitor = require( './monitor' ).Monitor,
	bunch = exports;
	
bunch.CLI = function( options ) {
	var settings = {}, // private protected settings
		defaults = {}, // public, configurable settings
		publicFunc = {}, // public functions
		commands = {}; // command line...commands
	
	settings = {
		bunchPath: process.cwd(),
		banner: ['.-.                     .-.       _       ',
						 ': :                     : :      :_;      ',
						 ': \`-. .-..-.,-.,-. .--. : \`-.    .-. .--. ',
						 '\' .; :: :; :: ,. :\'  ..\': .. : _ : :\`._-.\'',
						 '\`.__.\'\`.__.\':_;:_;\`.__.\':_;:_;:_;: :\`.__.\'',
						 '                               .-. :      ',
						 '                               \`._.\'']
	};
	
	defaults = {
		'compress': false,
		'clean': false,
		'msg': function( text ) {
			console.log( text );
		}
	};
	
	options = options || {};
	
	for ( var d in defaults ) {
		if ( !d in options ) { 
			options[d] = defaults[d];
		}
	}
	
	msg = options.msg || function( text ) {
		console.log( text );
	};
	
	
	publicFunc = {
		/** 
		* The main deal yo. Pass it some command line arguments and watch it do it's thing
		* @method process
		* @param Array args command line arguments
		*/
		'process': function( args, callback ) {
			args = args.filter( function( arg ) {
					var match = arg.match( /^--?([a-z][0-9a-z]*)(?:=([^\s]+))?$/i );
					if ( match ) { 
						arg = match[1]; 
					} else { 
						return arg; 
					}
					switch ( arg ) {
						case 'v':
						case 'version':
							msg( "bunch " + version.join( '.' ) );
							break;
						case 'verbose':
							options.verbose = true;
							break;
						case 's':
						case 'silent':
							options.silent = true;
							break;
						case 'h':
						case 'help':
							commands.help( args.splice( 1 ) );
							break;
						case 'clean' || 'c':
							options.clean = true;
							break;
						case 'compress' || 'x':
							options.compress = true;
							break;
					}
			} );
			
			if ( args[0] in commands ) {
				commands[args[0]]( options, callback );
			}
		}
	};
	
	commands = {
		'help': function( options ) {
			var command;
			msg( 'Commands:' );
			for( command in commands ) {
				if ( commands.hasOwnProperty( command ) ) {
					msg( '  bunch ' + command );
				}
			}
		},
		'init': function( options, callback ) {
			var inFile;
			// read the contents of our example file
			fs.readFile( path.join( __dirname, 'templates', 'Bunchfile' ), function( err, out ) {
				path.exists( path.join( process.cwd(), 'Bunchfile' ), function( exists ) {
					if ( exists ) {
						msg( 'Looks like you already have a Bunchfile.' );
						if ( callback ) {
							callback();
						} else {
							process.exit();
						}
					} else {
						fs.writeFile( path.join( process.cwd(), 'Bunchfile' ), out, function( err, out ) {
							msg( 'Wrote file Bunchfile to ' + process.cwd() );
							if ( callback ) {
								callback();
							} else {
								process.exit();
							}
						} );
					}
				} );
			} );
		},
		'monitor': function( options ) {
			var monit = monitor(),
				reporter = {
					'report': function( data ) {
						msg( data );
					}
				};
			msg( settings.banner.join('\n') + '\n' );
			monit.startMonitor( path.join( process.cwd(), 'Bunchfile' ), reporter );
		},
		'pack': function( options, callback ) {
			var packer = packager();
			options.config = path.join( process.cwd(), 'Bunchfile' );
			packer.pack( options, function( err, files ) {
				for( var i = 0; i < files.length; i++ ) {
					msg( 'Wrote file ' + files[i] );
				}
				if ( callback ) {
					callback();
				} else {
					process.exit();
				}
			} );
		}
	};
	
	// return a reference to our public functions
	return publicFunc;
};