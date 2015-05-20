var gulp = require('gulp');
var nodemon = require('gulp-nodemon');

gulp.task('server', function () {
  nodemon({
    script: './bin/www',
    ext: 'js html css',
    env: { 
    		'NODE_ENV': 'development' 
    	 }
  });
});

gulp.task('default', ['server'], function() {

});