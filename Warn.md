Warnings in Monitor
===================


- For JS bundle failures, we check if the bundle was previously built successfully. If it was, we inject a console.warn message into the top of it.
- For CSS errors, we check if the bundle was previously built successfully. If it was, we inject a body:before rule with a simplified version of the error


When: 
- A source file is missing - skip it, add a warning message to the top of the bundle.
- A config file is missing - log a warning to the command line
- A monitored config file is invalid - 
- A bundle fails to build, less or closure error - add a warning message to the top of the bundle 
- when a Less CSS error occurs, try to sort out which file it occurred in and give a more meaningful error.
