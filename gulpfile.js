var gulp = require('gulp')
var gulpUtil = require('gulp-util')
var argv = require('minimist')(process.argv.slice(2))
var path = require('path')
var through2 = require('through2')
var inspect = require('util').inspect
var darkmagic = require('darkmagic')
var Dependency = darkmagic.Dependency
var esprima = require('esprima')
var os = require('os')
var escodegen = require('escodegen')
var fs = require('fs')
var mkdirp = require('mkdirp')

var target = argv.path || process.cwd()
var dispelDir = path.resolve(target, '..', 'dispel')
gulpUtil.log('target is ' + target)
gulpUtil.log('dispel dir is ' + dispelDir)

var anchorModule

gulpUtil.log('warning, this is an experimental process...')

gulp.task('default', ['anchorModule'], function() {

	gulpUtil.log('processing files at ' + target)

	return gulp.src(path.join(target, '**', argv.filter || '*.js'))
		.pipe(through2.obj(transform))
		.pipe(gulp.dest(dispelDir))
})

gulp.task('anchorModule', ['mkDispelDir'], function (cb) {
	var anchorModulePath = path.join(dispelDir, '$deleteMe.js')

	fs.writeFile(anchorModulePath, 'module.exports = module', function (err) {
		if (err) return cb (err)

		anchorModule = require(anchorModulePath)
		cb()
	})
})

gulp.task('mkDispelDir', function (cb) {
	mkdirp(dispelDir, cb)
})

function transform(file, encoding, callback) {

	if (file.isBuffer()) {
		gulpUtil.log('processing ' + file.path)

		var parsed = esprima.parse(file.contents)

		if (parsed.body.length === 0) {
			gulpUtil.log('skipping ' + file.path + ' because there are no parameters')
			return callback(null, file)
		}

		var body

		for (var j = 0; j < parsed.body.length; j++) {
			var s1 = parsed.body[j]	

			if (s1.type === 'ExpressionStatement' && s1.expression.type === 'AssignmentExpression' && s1.expression.right.type === 'FunctionExpression') {
				body = s1
				break;
			}
		}

		if (body.expression.right.id && body.expression.right.id.name.indexOf('dontInject') === 0) {
			gulpUtil.log('skipping ' + file.path + ' because export is explicitely not injectable')
			return callback(null, file)
		}

		if (body) {
			var params = body.expression.right.params
			var parent = new Dependency('$injector')
			var code = ''
			var isAsync = false

			if (params.length > 0 && hasCallback(params)) {
				gulpUtil.log('*** module ' + path.basename(file.path) + ' is async')
				isAsync = true
				params.pop()
			}

			for (var i = 0; i < params.length; i++) {
				var dependencyName = params[i].name

				gulpUtil.log('resolving dependency ' + dependencyName)

				if (dependencyName === '$injector') {
					code += 'var $injector = null;'
					gulpUtil.log('warning: $injector dependency cannot be required, this must be handled manually some how')
					continue
				}

				var d = new Dependency(dependencyName)

				d.searchPaths([target])

				d.load(anchorModule, parent)

				var requireId = d.requireId

				if (d.isLocal) {
					requireId = './' + path.relative(target, d.requireId)
				}

				code += 'var ' + dependencyName + ' = require(\'' + requireId + '\');' + os.EOL
			}

			if (isAsync) {
				code += 'function callback() { throw new Error("must implement callback") };' + os.EOL
			}

			if (params.length > 0) {
				code += os.EOL
			}

			var codeBody = body.expression.right.body
		
			for (var x = 0; x < codeBody.body.length; x++) {
				var statement = codeBody.body[x]

				if (statement.type === 'ReturnStatement') {
					codeBody.body[x] = {
						type: 'ExpressionStatement',
						expression: {
							type: 'AssignmentExpression',
							operator: '=',
							left: {
								type: 'MemberExpression',
								computed: false,
								object: {
									type: 'Identifier',
									name: 'module'
								},
								property: {
									type: 'Identifier',
									name: 'exports'
								}
							}, 
							right: statement.argument
						}
					}
				}
			}

			if (codeBody.body.length > 0) {
				codeBody.type = 'Program'
				code += escodegen.generate(codeBody)
			}

			file.contents = new Buffer(code)
		} else {
			gulpUtil.log('skipping ' + file.path)
		}

		return callback(null,  file)
	}

	return callback(new Error('unsupported file medium'))
}

function hasCallback(params) {
	return params[params.length - 1].name === 'callback'
}
