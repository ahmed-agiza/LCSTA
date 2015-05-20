var gulp = require('gulp'),
 	nodemon = require('gulp-nodemon'),
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat'),
	minifyCss = require('gulp-minify-css'),
	sourcemaps = require('gulp-sourcemaps');
 
gulp.task('minify-css', function() {
  return gulp.src('./public/stylesheets/*.css')
  	.pipe(concat('application.css'))
    .pipe(rename({suffix: '.min'}))
    .pipe(sourcemaps.init())
    .pipe(minifyCss())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./public/'));
});


gulp.task('compress', function() {
  return gulp.src(['jquery-2.1.3.min.js', 'bootstrap.min.js'])
    .pipe(concat('application.js'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest('./public/'));
});

gulp.task('server', function () {
  nodemon({
    script: './bin/www',
    ext: 'js html css',
    env: { 
    		'NODE_ENV': 'development' 
    	 }
  });
});

gulp.task('default', ['minify-css', 'compress', 'server'], function() {

});