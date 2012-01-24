// Dependencies
var fs = require( 'fs' ),
	path = require( 'path' ),
	_ = require( 'underscore' ),
	wrench = require( 'wrench' ),
	packager = require( '../lib/bunch' ).Packager();
	
exports.TestHelper = function() {
	var cleanupList = [],
		publicFn = {},
		privateFn = {},
		defaults = {};
		
	defaults = {
		config: {
			"jsDir": "js",
			"cssDir": "css",
			"sourceDir": "src",
			"buildDir": "bin",
			"bundles": {
				"example_base.js": [
					"vendor/jquery.js",
					"app.js"
				],
				"example_base.css": [
					"reset.css",
					"app.css"
				]
			}
		}
	};
	
	publicFn = {
		/**
		* Write a Bunchfile to our current directory
		* and write out dummy files for each of the source files in config
		*/
		'newSetupSync': function( config ) {
			if ( typeof( config ) == "string" ) {
				privateFn.createSourceFilesSync( config );
			} else {
				config = _.extend( {}, defaults.config, config );
				privateFn.createBunchFileSync( config );
				privateFn.createSourceFilesSync( config );
			}

		}, 
		'setupSync': function( packer ) {
			var fileList = packer.getFileList(),
				config = packer.toJSON(),
				fileName = "",
				fileContents = "",
				i;
			// make our source directories 
			wrench.mkdirSyncRecursive( config.jsDir + '/' + config.sourceDir, '0755' );
			wrench.mkdirSyncRecursive( config.cssDir + '/' + config.sourceDir, '0755' );
			for( i = 0; i < fileList.length; i++ ) {
				fileName = fileList[i];
				if ( fileName.match( /\.js$/ ) ) {
					// write out the JS file with 
					fileContents = "var testObj = testObj || {};\ntestObj['" + fileName + "'] = true;";
					fs.writeFileSync( fileName, fileContents );
					cleanupList.push( fileName );
				} else if ( fileName.match( /\.css$/ ) ) {
					// write out the JS file with 
					fileContents = ".test-" + i + " { width: " + i + "px; } .test-" + i + ":after { content: \"" + fileName + "\"; }";
					fs.writeFileSync( fileName, fileContents );
					cleanupList.push( fileName );
				}
			}
		},
		'cleanupSync': function( ) {
			wrench.rmdirSyncRecursive( 'tmp' );
		},
		'resetBuildSync': function( packer ) {
			var config = packer.toJSON();
			try {
				wrench.rmdirSyncRecursive( config.jsDir );
				wrench.rmdirSyncRecursive( config.cssDir );
				privateFn.createSourceFilesSync();
			} catch ( e ) { 
				console.log( e ); 
			}
		}
	};
	
	privateFn = {
		createBunchFileSync: function( config ) {
			fs.writeFileSync( path.join( process.cwd(), 'Bunchfile' ), JSON.stringify(config) );
		},
		createSourceFilesSync: function( config ) {
			var fileList, 
				fileName,
				i;
			packager.loadConfigSync( config );
			fileList = packager.getFileList();
			for( i = 0; i < fileList.length; i++ ) {
				fileName = fileList[i];
				if ( fileName.match( /\.js$/ ) ) {
					// write out the JS file with 
					fileContents = "var testObj = testObj || {};\ntestObj['" + fileName + "'] = true;";
					wrench.mkdirSyncRecursive( path.dirname( fileName ), '0755' );
					fs.writeFileSync( fileName, fileContents );
					cleanupList.push( fileName );
				} else if ( fileName.match( /\.(css|less)$/ ) ) {
					// write out the JS file with 
					fileContents = ".test-" + i + " { width: " + i + "px; }\n.test-" + i + ":after { content: \"" + fileName + "\"; }";
					wrench.mkdirSyncRecursive( path.dirname( fileName ), '0755' );
					fs.writeFileSync( fileName, fileContents );
					cleanupList.push( fileName );
				}
			}
		}
	};
	
	return publicFn;
};