var vow       = require('vow'),
    EOL       = require('os').EOL,
    path      = require('path'),
    postcss   = require('postcss'),
    buildFlow = require('enb').buildFlow || require('enb/lib/build-flow');

module.exports = buildFlow.create()
    .name('enb-postcss')
    .target('target', '?.css')
    .defineOption('plugins')
    .defineOption('parser')
    .defineOption('comments', false)
    .defineOption('sourcemap', false)
    .useFileList(['css', 'post.css'])
    .builder(function (files) {
        var def = vow.defer(),
            _this = this,
            dirname = this.node.getDir(),
            filename = this.node.resolvePath(this._target),
            targetDir = path.dirname(filename),
            css = files.map(function (file) {
                var url = path.relative(targetDir, file.fullname),
                    pre = '',
                    post = '';

                if (_this._comments) {
                    pre = '/* ' + url + ':begin */' + EOL;
                    post = '/* ' + url + ':end */' + EOL;
                    return pre + '@import "' + url + '";' + EOL + post;
                } else {
                    return '@import "' + url + '";';
                }
            }).join('\n'),
            output;

        output = postcss(_this._plugins)
            .process(css, {
                from: filename,
                to: filename,
                map: _this._sourcemap,
                parser: _this._parser
            })
            .catch(function (error) {
                if (error.name === 'CssSyntaxError') {
                    process.stderr.write(error.message + error.showSourceCode());
                } else {
                    def.reject(error);
                }
            })
            .then(function (result) {
                result.warnings().forEach(function (warn) {
                    process.stderr.write(warn.toString());
                });

                def.resolve(result);
            });

        return def.promise();
    })
    .createTech();
