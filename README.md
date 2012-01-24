# bunch.js

Bunch.js is a manifest-driven CSS and Javascript packaging utility. Here's what makes bunch.js awesome:

- He's a stand-alone program. No server-side code or framework required. 
- He packages AND minifies your JS and CSS files for you. 
- He's manifest driven. With one configuration file, he makes it easy to see what JS and CSS files are in use on your site, and what needs retired.
- He runs all your CSS through [Less](http://lesscss.org/) for you.
- He lets you provide global variables to your CSS and JS.
- He's got a monitor mode that will automatically rebuild your bundles when they change. 

## Installation

You can install bunch.js from npm: 

	npm install bunch --global
	
Or if you wish to build from source, checkout the repository, and run:

	npm install --global

## Usage

To generate a new Bunch file for your project, run:

	bunch init

To pack your bundles, run:

	bunch pack

To start monitoring the source files for changes, run:

	bunch monitor
	
## The Bunchfile

As stated above, bunch.js is manifest driven. All your instructions to bunch.js should live in a Bunchfile. A Bunchfile is simply a JSON document with a few specific variables that allow you to control how bunch.js will bundle your code. 

	{
		"jsDir": "js", // This is a relative path to where your JS files live
		"cssDir": "css", // This is a relative path to where your CSS files live
		"sourceDir": "src", // This is the name of the dir inside jsDir and cssDir where your source files will live.
		"buildDir": "bin", // This is the name of the dir inside jsDir and cssDir where your built files will live.
		"bundles": { // List each bundle in here like so...
			"example_base.js": [
				"vendor/jquery.js",
				"app.js"
			],
			"example_base.css": [
				"reset.css",
				"app.css"
			]
		},
		"variables": { // You can specify variables here. Objects are not supported in CSS, and will simply be ignored.
			"baseURL": "/staging/bunchShop/",
			"mainColor": "#385903",
			"bunches": ["Bananas", "Flowers", "Grapes", "Carrots", "Bradys"]
		}
	}
	
# Upgrading an existing project from pickle.js

Bunch used to be called pickle.js. If you're upgrading from pickle.js, simply rename Pickler to Bunchfile and you should be good to go. 


# Running the tests

Bunch.js is tested with [Vows](http://vowsjs.org/), and each path expects to be run in it's own process. This much change in the future, but for now it means passing the isolate parameter to vows when running the test suite. 

	vows test/test_bunch* -i


# License

Bunch.js is released under the [Modified BSD License](https://github.com/thebarbariangroup/bunch.js/blob/master/LICENSE).