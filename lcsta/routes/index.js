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
var ConstraintsParser = require('../models/timing_constraints_parser');
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
	if(typeof(req.files.netlist) === 'undefined'){
		console.log('No netlist uploaded');
		req.flash('error', 'Select a Verilog netlist file to process.');
		res.redirect('/');
		return;
	}

	if(typeof(req.files.stdcell) === 'undefined'){
		console.log('No standard cell file uploaded');
		req.flash('error', 'Select a standard cell library file to process.');
		res.redirect('/');
		return;
	}

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


	if(typeof(req.files.constr) === 'undefined'){
		console.log('No constraints files uploaded');
		req.flash('error', 'Select net capacitances files to process.');
		res.redirect('/');
		return;
	}

	var netlistPath = './' + req.files.netlist.path; //Netlist file path.
	var stdcellPath = './' + req.files.stdcell.path; //Stdcell file path.
	var clkPath = './' + req.files.clk.path; //Clock skews file path.
	var capPath = './' + req.files.cap.path; //Net capacitances file path.
	var constrPath = './' + req.files.constr.path; //Timing constraints file path.

	fs.readFile(stdcellPath, 'utf8', function(err, stdcellData){
		if(err){
				console.log(err);
				req.flash('error', 'Error while reading the standard cell file.');
		        res.redirect('/');
		        fs.unlink(stdcellPath); //Deleting uploaded file.
		        fs.unlink(netlistPath);
		        fs.unlink(clkPath);
		        fs.unlink(capPath);
		        fs.unlink(constrPath);
		        return;
		    }else{
		    	LibertyParser.parse(stdcellData, function(err, stdcells){
		    		if(err){
		    			console.log(err);
		    			req.flash('error', 'Error while parsing the standard cell file.');
		        		res.redirect('/');
		        		fs.unlink(stdcellPath); //Deleting uploaded file.
		        		fs.unlink(netlistPath);
						fs.unlink(clkPath);
						fs.unlink(capPath);
						fs.unlink(constrPath);
						return;
		    		}else{
		    			fs.readFile(capPath, 'utf8', function(err, capData){
		    				if(err){
				    			console.log(err);
				    			req.flash('error', 'Error while reading the net capacitances file.');
				        		res.redirect('/');
				        		fs.unlink(stdcellPath); //Deleting uploaded file.
						        fs.unlink(netlistPath);
						        fs.unlink(clkPath);
						        fs.unlink(capPath);
						        fs.unlink(constrPath);
						        return;
				    		}else{
				    			CapParser.parse(capData, function(err, caps){
				    				if(err){
						    			console.log(err);
						    			req.flash('error', 'Error while paarsing the net capacitances file.');
						        		res.redirect('/');
						        		fs.unlink(stdcellPath); //Deleting uploaded file.
								        fs.unlink(netlistPath);
								        fs.unlink(clkPath);
								        fs.unlink(capPath);
								        fs.unlink(constrPath);
		       							return;
						        	}else{
						        		fs.readFile(clkPath, 'utf8', function(err, clkData){
						        			if(err){
								    			console.log(err);
								    			req.flash('error', 'Error while reading the clock skews file.');
								        		res.redirect('/');
								        		fs.unlink(stdcellPath); //Deleting uploaded file.
										        fs.unlink(netlistPath);
										        fs.unlink(clkPath);
										        fs.unlink(capPath);
										        fs.unlink(constrPath);
		       									return;
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
												        fs.unlink(constrPath);
		       											return;
								        			}else{
								        				fs.readFile(constrPath, 'utf8', function(err, constrData){
								        					if(err){
								        						console.log(err);
												        		req.flash('error', 'Error while reading the constraints file.');
												        		res.redirect('/');
												        		fs.unlink(stdcellPath); //Deleting uploaded file.
														        fs.unlink(netlistPath);
														        fs.unlink(clkPath);
														        fs.unlink(capPath);
														        fs.unlink(constrPath);
		       													return;
								        					}else{
								        						ConstraintsParser.parse(constrData, function(err, constr){
								        							if(err){
								        								console.log(err);
																        req.flash('error', 'Error while parsing the constraints file.');
																        res.redirect('/');
																        fs.unlink(stdcellPath); //Deleting uploaded file.
																		fs.unlink(netlistPath);
																		fs.unlink(clkPath);
																		fs.unlink(capPath);
																		fs.unlink(constrPath);
		       															return;
								        							}else{
								        								fs.readFile(netlistPath, 'utf8', function(err, netlistData){
												        					if(err){
												        						console.log(err);
																        		req.flash('error', 'Error while reading the netlist file.');
																        		res.redirect('/');
																        		fs.unlink(stdcellPath); //Deleting uploaded file.
																		        fs.unlink(netlistPath);
																		        fs.unlink(clkPath);
																		        fs.unlink(capPath);
																		        fs.unlink(constrPath);
		       																	return;
												        					}else{
												        						VerilogParser.parse(netlistData, stdcells, caps, skews, function(err, cells){
												        							if(err){
														        						console.log(err);
																		    			req.flash('error', 'Error while parsing the netlist file.');
																		        		res.redirect('/');
																		        		fs.unlink(stdcellPath); //Deleting uploaded file.
																				        fs.unlink(netlistPath);
																				        fs.unlink(clkPath);
																				        fs.unlink(capPath);
																				        fs.unlink(constrPath);
		       																			return;								
														        					}else{
														        						var cellReports = [
															        											{
															        												name: '_1_', //Dummy Data!
															        												module: 'AND2X1',
					 																								AAT: 0.5,
					 																								RAT: 0.5,
					 																								slack: 0.5,
					 																								timing_violation: false},
															        											{
															        												name: '_2_',
															        												module: 'AND2X2',
					 																								AAT: 0.2,
					 																								RAT: 0.3,
					 																								slack: 0.6,
					 																								timing_violation: false},
															        											{
															        												name: '_3_',
															        												module: 'DFF2X1',
					 																								AAT: 0.5,
					 																								RAT: 0.1,
					 																								slack: 0.2,
					 																								timing_violation: true},
															        											{
															        												name: '_4_',
															        												module: 'INVX8',
					 																								AAT: 0.05,
					 																								RAT: 0.02,
					 																								slack: 0.03,
					 																								timing_violation: false}
				 																							];
														        						var generalReports = {
														        												ipsum: 'quis blandit magna',
														        												dolor: 0.02,
														        												sit: 0.2,
														        												amet: 'mattis pulvinar turpis',
														        												consectetur: 0.06,
														        												adipiscing: 'elit',
														        												proin: 120
														        											  };
														        						var cellsContents = [];
														        						var stdCellsContent = [];
														        						for(var key in cells){
														        							if(!cells[key].is_dummy && !cells[key].is_input && !cells[key].is_output){
															        							var cellItem = {};
															        							cellItem.name = cells[key].instanceName;
															        							var cellInputs = cells[key].getInputs();
															        							var cellOutputs = cells[key].getOutputs();
															        							if(typeof cellInputs !== 'undefined')
															        								cellItem.number_of_inputs = cells[key].getInputs().length;
															        							else
															        								cellItem.number_of_inputs = 0;
															        							if(typeof cellOutputs !== 'undefined')
															        								cellItem.number_of_outputs = cells[key].getOutputs().length;
															        							else
															        								cellItem.number_of_outputs = 0;

															        							cellItem.size = cells[key].size;
															        							cellItem.module = cells[key].cellName;
															        							cellsContents.push(cellItem);
														        							}
														        						}

														        						for(var key in stdcells.cells){
														        							var cell = stdcells.cells[key];
															        						if(!cell.is_dummy && !cell.is_input && !cell.is_output){
															        							var cellItem = {};
															        							cellItem.name = key;
															        							if(typeof cell.area !== 'undefined')
															        								cellItem.area = cell.area;
															        							else
															        								cellItem.area = 'N/A';

															        							if(typeof cell.cell_leakage_power !== 'undefined')
															        								cellItem.cell_leakage_power = cell.cell_leakage_power;
															        							else
															        								cellItem.cell_leakage_power = 'N/A';
															        							var inputPins = [],
															        								outputPins = [];
															        							for(var pinKey in cell.pins){
															        								if(cell.pins[pinKey].direction == 'input')
															        									inputPins.push(pinKey);
															        								else if (cell.pins[pinKey].direction == 'output')
															        									outputPins.push(pinKey);
															        							}

															        							if(inputPins.length == 0){
															        								cellItem.input_pins = '[]';
															        							}else if (inputPins.length == 1){
															        								cellItem.input_pins = '[' + inputPins[0] + ']';
															        							}else{
															        								cellItem.input_pins = '[' + inputPins[0];
															        								for(var i = 1; i < inputPins.length; i++){
															        									if(i != inputPins.length - 1)
															        										cellItem.input_pins = cellItem.input_pins + ', ' + inputPins[i];
															        									else
															        										cellItem.input_pins = cellItem.input_pins + ', ' + inputPins[i] + ']';
															        								}
															        							}

															        							if(outputPins.length == 0){
															        								cellItem.output_pins = '[]';
															        							}else if (outputPins.length == 1){
															        								cellItem.output_pins = '[' + outputPins[0] + ']';
															        							}else{
															        								cellItem.output_pins = '[' + outputPins[0];
															        								for(var i = 1; i < outputPins.length; i++){
															        									if(i != outputPins.length - 1)
															        										cellItem.output_pins = cellItem.output_pins + ', ' + outputPins[i];
															        									else
															        										cellItem.output_pins = cellItem.output_pins + ', ' + outputPins[i] + ']';
															        								}
															        							}
															        							stdCellsContent.push(cellItem);
															        						}
														        						}
														        						
														        						res.render('report', {title: 'Timing Report',
														        											  error: '',
														        											  warnings: '[]',
														        											  verilog_code: netlistData,
														        											  netlist_cells: JSON.stringify(cellsContents),
														        											  stdcells: JSON.stringify(stdCellsContent),
														        											  cell_reports: JSON.stringify(cellReports),
														        											  general_report: JSON.stringify(generalReports)});
														        						fs.unlink(stdcellPath); //Deleting uploaded file.
																				        fs.unlink(netlistPath);
																				        fs.unlink(clkPath);
																				        fs.unlink(capPath);
																				        fs.unlink(constrPath);
														        					}
												        						})/****END PARSE NETLIST FILE****/
												        					}
												        				});/****END READ NETLIST FILE****/
								        							}
								        						}); /***END OF PARSE CONSTRAINTS.***/
								        					}
								        				}); /***END OF READ CONSTRAINTS.***/
								        				
								        			}
								        		});/****END PARSE CLK FILE****/
								        	}
						        		});/****END READ CLK FILE****/
						        	}
				    			}); /****END PARSE CAP FILE****/
				    		}
		    			});/****END READ CAP FILE****/
		    		}
		    		
		    	});/****END PARSE STDCELL****/
		    }
	});/****END READ STDCELL****/

	
});

module.exports = router;
