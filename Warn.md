Warnings in Monitor
===================


- For JS bundle failures, we check if the bundle was previously built successfully. If it was, we inject a console.warn message into the top of it.
- For CSS errors, we check if the bundle was previously built successfully. If it was, we inject a body:before rule with a simplified version of the error


We also want to make sure monitor will not die if a source file is missing. It should simply render the error as above
