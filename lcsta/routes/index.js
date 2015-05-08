"use strict";

var express = require('express');
var multer = require('multer');
var fs = require('fs');
var flash = require('connect-flash');
var router = express.Router();

var VerilogParser = require('../models/netlist_parser');
var LibertyParser = require('../models/liberty_parser');
var ClockParser = require('../models/clock_skews_parser');
var CapParser = require('../models/net_capacitances_parser');
var Cell = require('../models/cell').cell;
var Connect = require('../models/cell').connect;
var TemplateCell = require('../models/cell').templateCell;

function countArray(obj){ //Key-value array size counter.
	var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}

function getKey(object, value){
    for( var prop in object) {
        if(object.hasOwnProperty(prop)) {
             if( object[prop] === value )
                 return prop;
        }
    }
}

router.get('/', function(req, res){ //File upload view.
	res.render('index', {title: 'Logic Circuit Static Timing Analysis', message: req.flash('error')});
});

router.get('/about', function(req, res){ //About view.
	res.render('about', {title: 'About LCSTA'});
});

router.get('/report', function(req, res){ //Timing report view.
	req.flash('error', 'Please select a Verilog netlist file to process.')
	res.redirect('/');
});


router.post('/report', function(req, res){ //Generate timing report.
	/*if(typeof(req.files.netlist) === 'undefined'){
		console.log('No netlist uploaded');
		req.flash('error', 'Select a Verilog netlist file to process.');
		res.redirect('/');
		return;
	}*/

	if(typeof(req.files.stdcell) === 'undefined'){
		console.log('No standard cell file uploaded');
		req.flash('error', 'Select a standard cell library file to process.');
		res.redirect('/');
		return;
	}
/*
	if(typeof(req.files.clk) === 'undefined'){
		console.log('No clock skews file uploaded');
		req.flash('error', 'Select a clock skews file to process.');
		res.redirect('/');
		return;
	}

	if(typeof(req.files.cap) === 'undefined'){
		console.log('No net capacitances files uploaded');
		req.flash('error', 'Select net capacitances files to process.');
		res.redirect('/');
		return;
	}
*/
	//var netlistPath = './' + req.files.netlist.path; //Netlist file path.
	var stdcellPath = './' + req.files.stdcell.path; //Stdcell file path.
	//var clkPath = './' + req.files.clk.path; //Clock skews file path.
	//var capPath = './' + req.files.cap.path; //Net capacitances file path.

	fs.readFile(stdcellPath, 'utf8', function(err, stdcellData){
		if(err){
				console.log(err);
				req.flash('error', 'Error while reading the standard cell file.');
		        res.redirect('/');
		        fs.unlink(stdcellPath); //Deleting uploaded file.
		        fs.unlink(netlistPath);
		        fs.unlink(clkPath);
		        fs.unlink(capPath);
		    }else{
		    	LibertyParser.parse(stdcellData, function(err, stdcell){
		    		if(err){
		    			console.log(err);
		    			req.flash('error', 'Error while parsing the standard cell file.');
		        		res.redirect('/');
		        		fs.unlink(stdcellPath); //Deleting uploaded file.
		        		fs.unlink(netlistPath);
						fs.unlink(clkPath);
						fs.unlink(capPath);
		    		}else{
		    			//console.log(stdcell);
		    			res.send(stdcell);
		    			return;
		    			fs.readFile(netlistPath, 'utf8', function(err, netlistData){
		    				if(err){
				    			console.log(err);
				    			req.flash('error', 'Error while reading the netlist file.');
				        		res.redirect('/');
				        		fs.unlink(stdcellPath); //Deleting uploaded file.
						        fs.unlink(netlistPath);
						        fs.unlink(clkPath);
						        fs.unlink(capPath);
				    		}else{
				    			VerilogParser.parse(netlistData, function(err, cells){
				    				if(err){
						    			console.log(err);
						    			req.flash('error', 'Error while parsing the netlist file.');
						        		res.redirect('/');
						        		fs.unlink(stdcellPath); //Deleting uploaded file.
								        fs.unlink(netlistPath);
								        fs.unlink(clkPath);
								        fs.unlink(capPath);
						        	}else{
						        		console.log(cells);
						        		fs.readFile(clkPath, 'utf8', function(err, clkData){
						        			if(err){
								    			console.log(err);
								    			req.flash('error', 'Error while reading the clock skews file.');
								        		res.redirect('/');
								        		fs.unlink(stdcellPath); //Deleting uploaded file.
										        fs.unlink(netlistPath);
										        fs.unlink(clkPath);
										        fs.unlink(capPath);
								        	}else{
								        		ClockParser.parse(clkData, function(err, skews){
								        			if(err){
								        				console.log(err);
										    			req.flash('error', 'Error while parsing the clock skews file.');
										        		res.redirect('/');
										        		fs.unlink(stdcellPath); //Deleting uploaded file.
												        fs.unlink(netlistPath);
												        fs.unlink(clkPath);
												        fs.unlink(capPath);
								        			}else{
								        				console.log(skews);
								        				fs.readFile(capPath, 'utf8', function(err, capData){
								        					if(err){
								        						console.log(err);
												    			req.flash('error', 'Error while reading the net capacitances file.');
												        		res.redirect('/');
												        		fs.unlink(stdcellPath); //Deleting uploaded file.
														        fs.unlink(netlistPath);
														        fs.unlink(clkPath);
														        fs.unlink(capPath);
								        					}else{
								        						CapParser.parse(capData, function(err, caps){
								        							if(err){
										        						console.log(err);
														    			req.flash('error', 'Error while parsing the net capacitances file.');
														        		res.redirect('/');
														        		fs.unlink(stdcellPath); //Deleting uploaded file.
																        fs.unlink(netlistPath);
																        fs.unlink(clkPath);
																        fs.unlink(capPath);
										        					}else{
										        						console.log(caps);
										        						res.send('true');
										        						fs.unlink(stdcellPath); //Deleting uploaded file.
																        fs.unlink(netlistPath);
																        fs.unlink(clkPath);
																        fs.unlink(capPath);
										        					}
								        						})/****END PARSE CAP FILE****/
								        					}
								        				});/****END READ CAP FILE****/
								        			}
								        		});/****END PARSE CLK FILE****/
								        	}
						        		});/****END READ CLK FILE****/
						        	}
				    			}); /****END PARSE NETLIST****/
				    		}
		    			});/****END READ NETLIST****/
		    		}
		    		
		    	});/****END PARSE STDCELL****/
		    }
	});/****END READ STDCELL****/

	
});

module.exports = router;
