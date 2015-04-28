#!/usr/bin/env node

// TODO: hacky code cleanup here 
// change gulp's cwd
// TODO test this works in windows
process.argv.push('--cwd=' + __dirname)
require('./node_modules/gulp/bin/gulp.js')