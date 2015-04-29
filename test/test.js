var cp = require('child_process')
var path = require('path')
var fs = require('fs')
var os = require('os')
var should = require('should')

describe('darkmagic-dispel', function () {

	it ('turns darkmagic code into normal code', function (done) {
		run(function (err, stdout, stderr) {
			if (err) return done(err)

			fs.readFileSync(path.resolve(__dirname, 'dispel', 'dmModule.js'), 'utf8').should.eql(expectedDmModule)
			fs.readFileSync(path.resolve(__dirname, 'dispel', 'x.js'), 'utf8').should.eql(expectedXModule)

			done()
		})
	})
})

function run(callback) {
	var params = [
		path.resolve(__dirname, '..', 'index.js'),
		'--path=' + path.join(__dirname, 'src')
	]

	var child = cp.execFile('node' , params, callback)
	
	child.stdout.pipe(process.stdout)
	//child.stderr.pipe(process.stderr)
}

var expectedDmModule = 
"var util = require('util');" + os.EOL +
"var fs = require('fs');" + os.EOL +
"var x = require('./x.js');" + os.EOL + os.EOL +
"console.log(x);" + os.EOL +
"module.exports = function () {" + os.EOL +
"};"

var expectedXModule =
'function callback() { throw new Error("must implement callback") };' + os.EOL + "console.log('hi');" 