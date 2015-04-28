var gulp = require('gulp')
var gulpUtil = require('gulp-util')
var argv = require('minimist')(process.argv.slice(2))
var path = require('path')
var through2 = require('through2')
var inspect = require('util').inspect
var darkmagic = require('darkmagic')
var Dependency = darkmagic.Dependency
var esprima = require('esprima')
var target = argv.path || process.cwd()
var os = require('os')
var escodegen = require('escodegen')

gulpUtil.log('warning, this is an experimental process...')

gulp.task('default', function() {

	gulpUtil.log('processing files at ' + target)

	return gulp.src(path.join(target, '**', '*.js'))
		.pipe(through2.obj(transform))
		.pipe(gulp.dest('dispel'))
})

function transform(file, encoding, callback) {

	if (file.isBuffer()) {
		gulpUtil.log('processing ' + file.path)

		var parsed = esprima.parse(file.contents)

		if (parsed.body.length === 0) return callback(null, file)

		var body = parsed.body[0]
		//console.log(body.expression)
		if (body.type === 'ExpressionStatement' && body.expression.type === 'AssignmentExpression' && body.expression.right.type === 'FunctionExpression') {
			var params = body.expression.right.params
			var parent = new Dependency('$injector')
			var code = ''
			var isAsync = false

			if (hasCallback(params)) {
				gulpUtil.log('*** module ' + path.basename(file.path) + ' is async')
				isAsync = true
				params.pop()
			}

			for (var i = 0; i < params.length; i++) {
				var dependencyName = params[i].name

				gulpUtil.log('resolving dependency ' + dependencyName)

				var d = new Dependency(dependencyName)

				d.searchPaths([target])

				d.load(module, parent)

				var requireId = d.requireId

				if (d.isLocal) {
					requireId = './' + path.relative(target, d.requireId)
				}

				code += 'var ' + dependencyName + ' = require(\'' + requireId + '\')' + os.EOL
			}

			if (isAsync) {
				code += 'function callback() { throw new Error("must implement callback") }' + os.EOL
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
		}

		return callback(null,  file)
	}

	return callback(new Error('unsupported file medium'))
}

function replaceReturnsWithExports(tree) {

}

function hasCallback(params) {
	return params[params.length - 1].name === 'callback'
}
