// Dependencies
var path = require( 'path' ),
	fs = require( 'fs' ),
	yui = require( 'yui-compressor' ),
	less = require( 'less' ),
	jm = require( '../minify_json' );
	bunch = exports;

bunch.Packager = function( ) {
	var settings, // private protected settings
		config, // public, configurable settings
		publicFunc, // public functions
		privateFunc; // private functions
	
	config = {
		variables: {}, // global variables available to both js and css
		cssDir: 'css', // directory css files reside in
		jsDir: 'js', // directory js files reside in
		buildDir: 'bin', // directory within css/js dir to build files to
		sourceDir: 'src', // directory within css/js to source files from
		css: {}, // config specific to css
		js: {}, // config specifc to js
		bundles: {} // the css and js bundle definitions 
	};
	
	settings = {
		reporter: { // object containing a report method -- allows control of output and where it goes
			report: function( ) {
				console.log( arguments );
			}
		},
		monitor: false // flag to determine if pack is being run from a monitor process
	};
	
	publicFunc = {
		/** 
		* Allows a new reporter to be used, rather than the default, console.log.
		* @method setReporter
		* @param Object reporter A object that responds to a report function.
		*/
		'setReporter': function( reporter ) {
			settings.reporter = reporter;
		},
		/** 
		* The loadConfig function takes a valid json configuration object and merges it into the current
		* configuration options. 
		* @method loadConfig
		* @param Object config A object in the form of the above config object.
		* @param Function callback A callback function to be executed after the config has been loaded
		*/
		'loadConfig': function( configObj, callback ) {
			var configContents;
			if ( typeof( configObj ) === 'string' ) {
				// if we were passed a string, instead of an object, assume it's a file path and try to load and parse it
				fs.readFile( configObj, 'utf-8', function( err, contents ) {
					if ( err ) throw err; 
					configObj = JSON.parse( jm.minify( contents ) );
					privateFunc.processConfigObject( configObj );
					if ( callback ) callback();
				} );
				
			} else if ( typeof( configObj ) === 'object' ) {
				privateFunc.processConfigObject( configObj );
				if ( callback ) callback();
			}
		},
		/** 
		* Synchronous version of loadConfig.
		*/
		loadConfigSync: function( configObj ) {
			var contents;
			if ( typeof( configObj ) === 'string' ) {
				// if we were passed a string, instead of an object, assume it's a file path and try to load and parse it
				contents = fs.readFileSync( configObj, 'utf-8' );
				configObj = JSON.parse( jm.minify( contents ) );
				privateFunc.processConfigObject( configObj );
			} else if ( typeof( configObj ) === 'object' ) {
				privateFunc.processConfigObject( configObj );
			}
		},
		/** 
		* pack iterates through each bundle of files and combines their contents into the output file.
		* It will then compress that file if the compress arg is passed as true. 
		*
		* @method pack
		* @param Object options Can contain a path to the config obj, a boolean compress flag, and a list of bundles to be packed
		* @param Function callback A callback function to be executed after all of the JS and CSS bundles have been built
		*/
		'pack': function( options, callback ) {
			var completedBundles = [],
				erredBundles = [],
				bundleList = [],
				reporter = settings.reporter,
				afterBundle = function( err, bundleName ) {
					if ( err ) {
						console.log("ERROR REPORTED", err, bundleName );
						reporter.report( err.name, err.message );
						erredBundles.push( bundleName );
						// publicFunc.logError( bundleName, err.name, err.message );
					} else {
						completedBundles.push( bundleName );
					}
					if ( completedBundles.length + erredBundles.length === bundleList.length ) {
						callback( null, completedBundles );
					}
				};
			options = options || {};
			if ( options.config ) {
				publicFunc.loadConfig( options.config, function( ) {
					options.bundles = options.bundles || publicFunc.getBundleList();
					bundleList = options.bundles;
					privateFunc.bundle( options.bundles, options.compress, afterBundle );
				} );
			} else {
				options.bundles = options.bundles || publicFunc.getBundleList();
				bundleList = options.bundles;
				privateFunc.bundle( options.bundles, options.compress, afterBundle );
			}
		},
		/**
		* getFileList returns an array of all of our source files
		* 
		* @method getFileList
		* @returns array the list of all source files used by the current config
		*/
		'getFileList': function() {
			var fileList = [],
				bundles = config.bundles,
				bundleName = '',
				filePath = '',
				reporter = settings.reporter;
			for ( bundleName in bundles ) {
				if ( bundles.hasOwnProperty( bundleName ) ) {
					for( i = 0, l = bundles[bundleName].length; i < l; i++ ) {
						try {
							filePath = path.join( privateFunc.getDir( path.extname( bundles[bundleName][i] ), 'source' ), bundles[bundleName][i] );
							if( fileList.indexOf( filePath ) == -1 ) fileList.push( filePath );
						} catch( e ) {
							reporter.report( e.name, e.message );
						}
					}
				}
			}
			return fileList;
		},
		/**
		* getFileList returns an object containing all of source files, and the bundles their dependent included in
		* 
		* @method getFiles
		* @returns object a map of all source files used by the current config with the bundles their included in
		*/
		'getFiles': function() {
			var files = {},
				bundles = config.bundles,
				bundleName = '',
				filePath = '',
				reporter = settings.reporter;
			for ( bundleName in bundles ) {
				if ( bundles.hasOwnProperty( bundleName ) ) {
					for( i = 0, l = bundles[bundleName].length; i < l; i++ ) {
						try {
							filePath = path.join( privateFunc.getDir( path.extname( bundles[bundleName][i] ), 'source' ), bundles[bundleName][i] );
							files[filePath] = files[filePath] || { 'bundles': [] };
							files[filePath].bundles.push( bundleName );
						} catch( e ) {
							reporter.report( e.name, e.message );
						}
					}
				}
			}
			return files;
		},
		/**
		* getBundleList returns an array of our bundles names
		* 
		* @method getBundleList
		* @return array List of bundle names
		*/
		'getBundleList': function() {
			var bundleList = [],
				bundles = config.bundles,
				bundleName = '';
			for ( bundleName in bundles ) {
				if ( bundles.hasOwnProperty( bundleName ) ) {
					bundleList.push( bundleName );
				}
			}
			return bundleList;
		},
		/**
		* logError handles rendering warnings for js and css bundles.
		* JS errors are console.error calls prepended to the bundle
		* CSS errors are new css rules prepended to the bundle that add a warning message at the top of the DOM
		* 
		* @method logError
		* @return nothing
		*/
		'logError': function( bundleName, errName, errMsg, callback ) {
			var errCode;
			console.log("LOG ERROR", bundleName );
			if ( privateFunc.fileType( path.extname( bundleName ) ) === 'css' ) {
				errCode = 'body:before {\n' + 
					'content: "' + errName + ': ' + errMsg + '";\n' + 
					'background: #333;\n' + 
					'color: #fff;\n' +
					'font-family: Helvetica, Tahoma, sans;\n' +
					'font-style: italic;\n' +
					'font-size: 12px;\n' +
					'padding: 10px 20px;\n' +
					' }';
			} else if ( privateFunc.fileType( path.extname( bundleName ) ) === 'js' ) {
				errCode = 'console.error( "Bunch.js Error - ' + errName + ': ' + errMsg + ');\n';
			}
			privateFunc.prependToBundle( bundleName, errCode, callback );
		},
		/** 
		* toJSON returns the configuration object
		*
		* @method toJSON
		* @return object the configuration object
		*/
		'toJSON': function() {
			return config;
		}
	};
	
	privateFunc = {
		/**
		* processConfigObject iterates over the properties of the passed config object,
		* and merges them into our config if they match a default
		* 
		* @method processConfigObject
		*/
		'processConfigObject': function( configObj ) {
			// merge the passed config with our default options
			for ( var key in configObj ) {
				// check that our default options has this key first
				if ( config.hasOwnProperty( key ) ) {
					config[key] = configObj[key];
				}
			}
		},
		/**
		* getDir provides a utitly function for retrieving a directory based on our config settings
		*
		* @method getDir
		* @param string ext The extension of the type of file you're using; js or css.
		* @param strgin use The use this directory serves; source or build.
		*/
		'getDir': function( ext, use ) {
			var fileType = privateFunc.fileType( ext.replace( /^(\.)?/, '' ) ),
				baseDir = config[ fileType + 'Dir' ],
				us = use + 'Dir';
				useDir = ( fileType in config && us in config[fileType] ) ? config[fileType][us] : config[us];
			return path.join( baseDir, useDir );
		},
		/**
		* fileType provides a utitly function for retrieving the type of file, 
		* based on it's extension
		*
		* @method fileType
		* @param string ext The extension of the file
		*/
		'fileType': function( ext ) {
			var extReg,
				extMap = {
					'css|less': 'css',
					'js': 'js'
				};
			for ( extReg in extMap ) {
				if ( ext.match( extReg ) ) {
					return extMap[extReg];
				}
			}
		},
		/**
		* Utility function to read one of our bundled files. It takes the relative path from the config,
		* translates it to an absolute path, handles FileNotFound errors, and ultimately passes off to 
		* our readFile function.
		*
		* @method readBundledFile
		* @param string filePath relative path to the source file
		* @param function callback Function to call when the file has been read, or an error occurs
		*/
		'readBundledFile': function( filePath, callback ) {
			var fullPath = path.join( privateFunc.getDir( path.extname( filePath ), 'source' ), filePath );
			path.exists( fullPath, function( exists ) {
				if ( exists ) {
					fs.readFile( fullPath, callback );
				} else {
					callback( new Error( 'FileNotFound: Could not find file ' + fullPath + ' : ' + filePath + ' : ' +  privateFunc.getDir( path.extname( filePath ), 'source' ) ), null );
				}
			} );
		},
		/**
		*
		*
		* @method bundle
		* @param array bundles Array of bundle names
		* @param boolean compress Pass true if you want the output run through closure compiler
		* @param function callback Function to call after bundling is completed
		*/
		'bundle': function( bundles, compress, callback ) {
			var i, l, fullPath, out, afterConcat;
			
			afterConcat = function( err, filePath, output ) {
				privateFunc.render( output, filePath, compress, callback );
			};
			if ( typeof( bundles ) === 'string' ) {
				bundles = [bundles];
			}
			for( i = 0, l = bundles.length; i < l; i++ ) {
				fullPath = path.join( privateFunc.getDir( path.extname( bundles[i] ), 'build' ), bundles[i] );
				out = '';
				if ( privateFunc.fileType( path.extname( bundles[i] ) ) === 'js' ) {
					out = privateFunc.processVariablesForJS();
					
				} else if ( privateFunc.fileType( path.extname( bundles[i] ) ) === 'css' ) {
					out = privateFunc.processVariablesForCSS();
				}
				privateFunc.addFiles( fullPath, config.bundles[bundles[i]].slice( 0 ), out, afterConcat );
			}
		},
		/**
		* Recursivly concatinates an array of files into a string
		*
		* @method addFiles
		* @param string bundlePath Path to the output bundle
		* @param array bundleFiles List of the source files in this bundle
		* @param string out Our output string.
		* @param function callback
		*/
		'addFiles': function( bundlePath, bundleFiles, out, callback ) {
			var reporter = settings.reporter;
			if ( bundleFiles.length > 0 ) {
				// recursion until the end of the list
				privateFunc.readBundledFile( bundleFiles[0], function( err, filecontents ) {
					if ( err ) {
						console.log( "MISSED FILE", err.message );
						if ( settings.monitor ) {
							// just inject the message right on into the bundle if we're in monitor mode
							out = out + privateFunc.getInlineError( bundlePath, err.message ) + '\n';
						} else {
							// use reporter if we're not in monitor mode
							reporter.report( err.name, err.message );
						}
					} else {
						out = out + filecontents + '\n';
					}
					// shift the file we just read out of our bundleFiles array
					bundleFiles.shift();
					// call it again
					privateFunc.addFiles( bundlePath, bundleFiles, out, callback );
				} );
			} else {
				// we ran out of files
				// time to run the callback
				callback( null, bundlePath, out );
			}
		},
		/**
		* Preprocessing and compression.
		*
		* @method render
		* @param string string Path to the output bundle
		* @param array bundleFiles List of the source files in this bundle
		* @param string out Our output string.
		* @param function callback
		*/
		'render': function( string, buildFile, compress, callback ) {
			var reporter = settings.reporter;
			if ( privateFunc.fileType( path.extname( buildFile ) ) === 'css' ) {
				// run the output through less
				try {
					less.render( string, function( e, out ) {
						// TODO - it seems to never make it into this block.
						// Less seems to be failing to throw errors correctly
						if ( e ) {
							// throw e;
							console.log("XXXXXXXXXX");
							if ( settings.monitor ) {
								publicFunc.logError( buildFile, 'LessError', e.message, function() {
									callback( e );
								} );
							} else {
								reporter.report( 'Failed to build bundle: ', buildFile, e.message );
								callback( e );
							}
							return false;
						}
						// compress it, if we have to
						if ( compress ) {
							yui.compile( out, { 'type': 'css' }, function( err, out ) {
								if ( err ) {
									reporter.report( 'Failed to build bundle: ', buildFile, err.message );
									callback( err );
									return false;
								}
								privateFunc.writeOut( buildFile, out, callback ); 
							} );
						} else {
							privateFunc.writeOut( buildFile, out, callback );
						}
					} );
				} catch ( err ) {
					if ( settings.monitor ) {
						// TODO: move this message builder into the logError function and start passing vars in
						var errMsg = err.message + ' [' + err.line + ',' + err.column + ']';
						publicFunc.logError( buildFile, 'Less ' + err.type, errMsg, function( ) {
							callback( err );
						} );
					} else {
						reporter.report( 'Failed to build bundle: ', buildFile, e.message );
						callback( err );
					}
					return false;
				}
			} else {
				// compress it, if we have to
				if ( compress ) {
					yui.compile( string, function( err, out ) {
						if ( err ) {
							reporter.report('Failed to build bundle: ', buildFile, err.message );
							callback( err );
							return false;
						}
						privateFunc.writeOut( buildFile, out, callback );
					} );
				} else {
					privateFunc.writeOut( buildFile, string, callback );
				}
			}
		},
		/**
		*
		*
		*
		*/
		writeOut: function( file, output, callback ) {
			// create the build directory if it doesn't exist
			path.exists( path.dirname( file ), function( exists ) {
				if ( exists ) {
					// write out the out file
					fs.writeFile( path.join( process.cwd(), file ), output, function() {
						// could output a success message here
						callback( null, file );
					} );
				} else {
					// create the build dir
					fs.mkdir( path.dirname( file ), '0777', function( ) {
						// write out the out file
						fs.writeFile( path.join( process.cwd(), file ), output, function() {
							// could output a success message here
							callback( null, file );
						} );
					} );
				}
			} );
		},
		/*
		* prependToBundle does exactly what it sounds like it'd do.
		* Pass it a bundle name, and some text, and it will prepend the text to the
		* start of the bundle. If the bundle does not exist, it logs a warning msg and
		* continues on it's way.
		*
		* @method prependToBundle
		* @param string bundleName The name of the bundle
		* @param string content The content to be prepended
		* @param function callback Function to be called after the content is prepended
		*/
		'prependToBundle': function( bundleName, content, callback ) {
			// FIXME - the bundleName is actually the relative path to the bundle at this point
			var fullPath = path.join( process.cwd(), bundleName ),
				reporter = settings.reporter;
			// check if the bundle exists	
			path.exists( fullPath, function( exists ) {
				if ( exists ) {
					fs.open( fullPath, 'a', 666, function( e, id ) {
						fs.write( id, content, null, 'utf8', function( ) {
							fs.close(id, function(){
								if ( callback )
									callback( null, bundleName );
							} );
						} );
					} );
				} else {
					// warn
					reporter.report( 'Failed to append to bundle: ', bundleName );
					//exit
					if ( callback )
						callback( null, false );
				}
			} );
		},
		/**
		*
		*
		*
		*/
		'processVariablesForJS': function() {
			// lets just be simple and copy
			var variables = config.variables,
				out = '';
				
			out = typeof( config.variables ) === 'object' ? 
				'var Bunch = Bunch || {};\nBunch.variables = ' + JSON.stringify( variables ) + ';\n' :
				'';
			return out;
		},
		/**
		*
		*
		*
		*/
		'processVariablesForCSS': function() {
			var out = '',
				variable,
				variableName,
				variables = config.variables,
				reporter = settings.reporter;
			for ( variableName in variables ) {
				if ( variables.hasOwnProperty( variableName ) ) {
					variable = variables[variableName];
					switch( typeof( variable ) ) {
						case 'object':
							// deal with this case later
							reporter.report( 'Bunch::Packager', 'objects are not supported as variables for css' );
							break;
						case 'function':
							// maybe run the function and use it's output to set the variable? 
							reporter.report( 'Bunch::Packager', 'functions are not supported as variables for css' );
							break;
						case 'string':
						case 'number':
							// check if we should quote or not quote
							if ( variable.match( /(px|em|pt)$/ ) || variable.match( /^\#/ ) ) {
								out = out +  '@' + variableName + ': ' + variable + ';\n';
							} else {
								out = out +  '@' + variableName + ': \'' + variable + '\';\n';
							}
							break;
					}
				}
			}
			return out;
		},
		'getInlineError': function( bundleName, errName, errMsg ) {
			var out = '';
			// handle args
			if ( typeof( errMsg ) === undefined ) { 
				errMsg = errName;
			} else {
				errMsg = errName + ": " + errMsg;
			}
			if ( js ) {
				out = 'console.warn("Bunch.js ::", errMsg);';
			} else if ( css ) {
				out = errCode = 'body:before {\n' + 
					'content: "' + errMsg + '";\n' + 
					'background: #333;\n' + 
					'color: #fff;\n' +
					'font-family: Helvetica, Tahoma, sans;\n' +
					'font-style: italic;\n' +
					'font-size: 12px;\n' +
					'padding: 10px 20px;\n' +
					' }'; 
			}
			return out;
		}
	};
	// return a reference to our public functions
	return publicFunc;
};