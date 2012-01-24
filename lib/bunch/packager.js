// Dependencies
var path = require( 'path' ),
	fs = require( 'fs' ),
	yui = require( 'yui-compressor' ),
	less = require( 'less' ),
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
		reporter: {
			report: function( ) {
				console.log( arguments );
			}
		}
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
			if ( typeof( configObj ) === "string" ) {
				// if we were passed a string, instead of an object, assume it's a file path and try to load and parse it
				fs.readFile( configObj, 'utf-8', function( err, contents ) {
					if ( err ) throw err; 
					configObj = JSON.parse( contents );
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
			if ( typeof( configObj ) === "string" ) {
				// if we were passed a string, instead of an object, assume it's a file path and try to load and parse it
				contents = fs.readFileSync( configObj, 'utf-8' );
				configObj = JSON.parse( contents );
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
						reporter.report( err.name, err.message );
						erredBundles.push( bundleName );
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
		* toJSON returns the configuration object 
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
			var baseDir = config[ext.replace( /^(\.)?/, '' ) + 'Dir' ],
				us = use + 'Dir';
				useDir = ( ext in config && us in config[ext] ) ? config[ext][us] : config[us];
			return path.join( baseDir, useDir );
		},
		/**
		*
		*
		*
		*/
		'readBundledFile': function( filePath, callback ) {
			var fullPath = path.join( privateFunc.getDir( path.extname( filePath ), 'source' ), filePath );
			path.exists( fullPath, function( exists ) {
				if ( exists ) {
					fs.readFile( fullPath, callback );
				} else {
					throw {
						type: 'FileNotFound',
						message: 'Could not find a file ' + fullPath + ' : ' + filePath + ' : ' +  privateFunc.getDir( path.extname( filePath ), 'source' )
					};
				}
			} );
		},
		/**
		*
		*
		*
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
				if ( path.extname( bundles[i] ) === '.js' ) {
					out = privateFunc.processVariablesForJS();
					
				} else if ( path.extname( bundles[i] ) === '.css' ) {
					out = privateFunc.processVariablesForCSS();
				}
				privateFunc.addFiles( fullPath, config.bundles[bundles[i]].slice( 0 ), out, afterConcat );
			}
		},
		/**
		*
		*
		*
		*/
		'addFiles': function( bundlePath, bundleFiles, out, callback ) {
			var reporter = settings.reporter;
			if ( bundleFiles.length > 0 ) {
				privateFunc.readBundledFile( bundleFiles[0], function( err, filecontents ) {
					if ( err ) {
						reporter.report( err.name, err.message );
					} else {
						out = out + filecontents + '\n';
					}
					bundleFiles.shift();
					privateFunc.addFiles( bundlePath, bundleFiles, out, callback );
				} );
			} else {
				// we ran out of files
				// time to run the callback
				callback( null, bundlePath, out );
			}
		},
		/**
		*
		*
		*
		*/
		'render': function( string, buildFile, compress, callback ) {
			var reporter = settings.reporter;
			if ( path.extname( buildFile ) === '.css' ) {
				// run the output through less
				try {
					less.render( string, function( e, out ) {
						if ( e ) {
							// throw e;
							reporter.report( 'Failed to build bundle: ', buildFile, e.message );
							callback( e );
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
				} catch ( e ) {
					reporter.report( 'Failed to build bundle: ', buildFile, e.message );
					callback( e );
					return false;
				}

			} else {
				// compress it, if we have to
				if ( compress ) {
					yui.compile( string, function( err, out ) {
						if ( err ) {
							reporter.report("Failed to build bundle: ", buildFile, err.message );
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
		/**
		*
		*
		*
		*/
		'processVariablesForJS': function() {
			// lets just be simple and copy
			var variables = config.variables,
				out = "";
				
			out = typeof( config.variables ) === "object" ? 
				"var Bunch = Bunch || {};\nBunch.variables = " + JSON.stringify( variables ) + ";\n" :
				"";
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
						case "object":
							// deal with this case later
							reporter.report( "Bunch::Packager", "objects are not supported as variables for css" );
							break;
						case "function":
							// maybe run the function and use it's output to set the variable? 
							reporter.report( "Bunch::Packager", "functions are not supported as variables for css" );
							break;
						case "string":
						case "number":
							// check if we should quote or not quote
							if ( variable.match( /(px|em|pt)$/ ) || variable.match( /^\#/ ) ) {
								out = out +  "@" + variableName + ": " + variable + ";\n";
							} else {
								out = out +  "@" + variableName + ": \"" + variable + "\";\n";
							}
							break;
					}
				}
			}
			return out;
		}
	};
	// return a reference to our public functions
	return publicFunc;
};