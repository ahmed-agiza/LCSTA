var express = require('express');
var flash = require('express-flash');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var fs = require('fs'); //fs for file processing.
var multer  = require('multer'); //Multer for file upload.

var routes = require('./routes/index');

var app = express();
app.use(favicon(__dirname + '/public/images/favicon.ico'));

app.set('trust proxy', 1) // trust first proxy 
app.use(session({
  secret: 'y9MXWKNiSKr3kdDACxNiSKr3kdDVPKACxNi'
}))

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash());

//Configuring multer for file upload.
app.use(multer({ 
    dest:                   './temp_uploads/',

    limits:                 {
                                fileSize: 4000000
                            },
    onFileUploadStart:      function (file, req, res) {
                                console.log(file.fieldname + ' is starting ...');
                            },
    onFileUploadComplete:   function (file, req, res) {
                                 console.log(file.fieldname + ' uploaded to  ' + file.path);
                            },
    onError:                function (error, next) {
                                console.log(error);
                                next(error);
                            },
    onFileSizeLimit:        function (file) {
                                 console.log('Failed: ', file.originalname);
                                 fs.unlink('./' + file.path);
                            },
    rename:                 function (fieldname, filename) {
                                return filename.replace(/\W+/g, '-').toLowerCase() + Date.now();
                            }


                })
    );
app.use('/', routes);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
