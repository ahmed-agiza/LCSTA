'use strict';

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
var STA = require('../models/static_timing_analysis');

function toTitleCase(str){
	var title = require('to-title-case');
	return title(str.replace(/_/gm, ' '));
};

function deepCompare () {
  var i, l, leftChain, rightChain;

  function compare2Objects (x, y) {
    var p;

    // remember that NaN === NaN returns false
    // and isNaN(undefined) returns true
    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
         return true;
    }

    // Compare primitives and functions.     
    // Check if both arguments link to the same object.
    // Especially useful on step when comparing prototypes
    if (x === y) {
        return true;
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if ((typeof x === 'function' && typeof y === 'function') ||
       (x instanceof Date && y instanceof Date) ||
       (x instanceof RegExp && y instanceof RegExp) ||
       (x instanceof String && y instanceof String) ||
       (x instanceof Number && y instanceof Number)) {
        return x.toString() === y.toString();
    }

    // At last checking prototypes as good a we can
    if (!(x instanceof Object && y instanceof Object)) {
        return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
        return false;
    }

    if (x.constructor !== y.constructor) {
        return false;
    }

    if (x.prototype !== y.prototype) {
        return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
         return false;
    }

    // Quick checking of one object beeing a subset of another.
    // todo: cache the structure of arguments[0] for performance
    for (p in y) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }
    }

    for (p in x) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }

        switch (typeof (x[p])) {
            case 'object':
            case 'function':

                leftChain.push(x);
                rightChain.push(y);

                if (!compare2Objects (x[p], y[p])) {
                    return false;
                }

                leftChain.pop();
                rightChain.pop();
                break;

            default:
                if (x[p] !== y[p]) {
                    return false;
                }
                break;
        }
    }

    return true;
  }

  if (arguments.length < 1) {
    return true; //Die silently? Don't know how to handle such case, please help...
    // throw "Need two or more arguments to compare";
  }

  for (i = 1, l = arguments.length; i < l; i++) {

      leftChain = []; //Todo: this can be cached
      rightChain = [];

      if (!compare2Objects(arguments[0], arguments[i])) {
          return false;
      }
  }

  return true;
}

  

router.get('/', function(req, res){ //File upload view.
	res.render('index', {title: 'Logic Circuit Static Timing Analysis', message: req.flash('error'), err_ver: false, err_std: false, err_time: false});
});

router.get('/about', function(req, res){ //About view.
	res.render('about', {title: 'About LCSTA'});
});

router.get('/report', function(req, res){ //Timing report view.
	req.flash('error', 'Please select a Verilog netlist file to process.')
	res.redirect('/');
});


router.post('/report', function(req, res){ //Generate timing report.

	var stringify_paths = function(pathsArray){
								var extractedArray = [];
								for(var i = 0; i < pathsArray.length; i++){
									var pathArray = [];
									for(var j = 0; j < pathsArray[i].length; j++){
										if(pathsArray[i][j].gate.is_input){

											pathArray.push({
															gate: {
																		name: pathsArray[i][j].gate.IO_wire,
																		name_id: pathsArray[i][j].gate.IO_wire.replace(/\[/gm, '_ob_').replace(/\]/gm, '_cb_').replace(/\s+/gm,'___'),
																		delay: pathsArray[i][j].gate.gate_delay.max,
										        						AAT: pathsArray[i][j].gate.AAT_max,
										        						module: 'Input Port',
										        						RAT: pathsArray[i][j].gate.RAT
										        				},
										        			port: 'In'
									        			});
										}
										else if(pathsArray[i][j].gate.is_output)
											pathArray.push({
															gate: {
																		name: pathsArray[i][j].gate.IO_wire,
																		name_id: pathsArray[i][j].gate.IO_wire.replace(/\[/gm, '_ob_').replace(/\]/gm, '_cb_').replace(/\s+/gm,'___'),
																		delay: pathsArray[i][j].gate.gate_delay.max,
										        						AAT: pathsArray[i][j].gate.AAT_max,
										        						module: 'Output Port',
										        						RAT: pathsArray[i][j].gate.RAT
										        				},
										        			port: pathsArray[i][j].port.name
									        			});
										else
											pathArray.push({
																gate: {
																			name: pathsArray[i][j].gate.instanceName,
																			name_id: pathsArray[i][j].gate.instanceName.replace(/\[/gm, '_ob_').replace(/\]/gm, '_cb_').replace(/\s+/gm,'___'),
																			delay: pathsArray[i][j].gate.gate_delay.max,
											        						AAT: (j == 0 && pathsArray[i][j].gate.is_ff)? pathsArray[i][j].gate.AAT_FF_start : pathsArray[i][j].gate.AAT_max,
											        						module: pathsArray[i][j].gate.cellName,
										        							RAT: (j == 0 && pathsArray[i][j].gate.is_ff)? pathsArray[i][j].gate.RAT_FF_start : pathsArray[i][j].gate.RAT,
											        				},
											        			port: pathsArray[i][j].port.name? pathsArray[i][j].port.name : 'In'
										        			});
									}
									extractedArray.push(pathArray);
								}

								return JSON.stringify(extractedArray);
							};
	var stringify_cells = function(cells){
		var cellsContents = [];
		for(var key in cells){
					if(!cells[key].is_dummy && !cells[key].is_input && !cells[key].is_output){
						var cellItem = {};
						cellItem.name = cells[key].instanceName;
						var cellInputs = cells[key].getInputs();
						var cellOutputs = cells[key].getOutputs();
						var inputNames = [];
						var outputNames = [];
						cellItem.number_of_inputs = (cellInputs || []).length;															        							
						cellInputs.forEach(function(inputGate){
								if(!inputGate.is_dummy){
									if(inputGate.is_input)
										inputNames.push('input ' + inputGate.IO_wire);
									else if (inputGate.is_output)
										inputNames.push('output ' + inputGate.IO_wire + ')');
									else
										inputNames.push(inputGate.instanceName);
								}
						});

						cellItem.number_of_outputs = (cellOutputs || []).length;
						cellOutputs.forEach(function(outputGate){
								if(!outputGate.is_dummy){
									if(outputGate.is_input)
										outputGate.push('input ' + outputGate.IO_wire);
									else if (outputGate.is_output)
										outputNames.push('output ' + outputGate.IO_wire);
									else
										outputNames.push(outputGate.instanceName);
								}
						});
						cellItem.input_names = '';
						cellItem.output_names = ';'
						if(inputNames.length > 0){
							if(inputNames.length == 1)
								cellItem.input_names = inputNames[0];
							else
								for(var i = 0; i < inputNames.length; i++)
									if(i == 0)
										cellItem.input_names = '[' + inputNames[i];
									else if (i == inputNames.length - 1)
										cellItem.input_names = cellItem.input_names + ',  ' + inputNames[i] + ']';
									else
										cellItem = cellItem.input_names + ',  ' + inputNames[i];
						}

						if(outputNames.length > 0){
							if(outputNames.length == 1)
								cellItem.output_names =  outputNames[0];
							else
								for(var i = 0; i < outputNames.length; i++)
									if(i == 0)
										cellItem.output_names = '[' + outputNames[i];
									else if (i == outputNames.length - 1)
										cellItem.output_names = cellItem.output_names + ',  ' + outputNames[i] + ']';
									else
										cellItem = cellItem.output_names + ',  ' + outputNames[i];
						}
						cellItem.size = cells[key].size;
						cellItem.module = cells[key].cellName;
						cellsContents.push(cellItem);
					}
				}
		return JSON.stringify(cellsContents);
	}

	var stringify_std = function(std){
		var stdCellsContent = [];
		for(var key in std){
					var cell = std[key];
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
				return JSON.stringify(stdCellsContent);
	}

	
	var fileWarnings = [];
	var emptyClkPath = './empty_temp/empty.clk.json' + Date.now() + ('' + Math.random()).split('.')[1];
	var emptyCapPath = './empty_temp/empty.cap.json' + Date.now() + ('' + Math.random()).split('.')[1];
	var emptyConstrPath = './empty_temp/empty.constr.json' + Date.now() + ('' + Math.random()).split('.')[1];

	var netlistPath; //Netlist file path.
	var stdcellPath; //Stdcell file path.
	var clkPath; //Clock skews file path.
	var capPath; //Net capacitances file path.
	var constrPath; //Timing constraints file path.

	if(typeof(req.files.netlist) === 'undefined'){
		console.log('No netlist uploaded');
		req.flash('error', 'Select a Verilog netlist file to process.');
		return res.render('index', {title: 'Logic Circuit Static Timing Analysis', message: req.flash('error'), err_ver: true, err_std: false, err_time: false});
	}else
		netlistPath = './' + req.files.netlist.path;

	if(typeof(req.files.stdcell) === 'undefined'){
		console.log('No standard cell file uploaded');
		req.flash('error', 'Select a standard cell library file to process.');
		return res.render('index', {title: 'Logic Circuit Static Timing Analysis', message: req.flash('error'), err_ver: false, err_std: true, err_time: false});
	}else
		stdcellPath = './' + req.files.stdcell.path;

	if(typeof(req.files.constr) === 'undefined'){
		console.log('No timing constraints file uploaded');
		req.flash('error', 'Select a timing constraints file to process.');
		return res.render('index', {title: 'Logic Circuit Static Timing Analysis', message: req.flash('error'), err_ver: false, err_std: false, err_time: true});
	}else
		constrPath = './' + req.files.constr.path;

	if(typeof(req.files.clk) === 'undefined'){
		fileWarnings.push('No clock skews file uploaded, assuming empty file.');
		fs.writeFileSync(emptyClkPath, '{}');
		console.log('No clock skews file uploaded.');
		clkPath = emptyClkPath;
	}else
		clkPath = './' + req.files.clk.path;
	


	if(typeof(req.files.cap) === 'undefined'){
		fileWarnings.push('No net capacitances file uploaded, assuming empty file.');
		fs.writeFileSync(emptyCapPath, '{}'); 
		console.log('No net capacitances file uploaded.');
		capPath = emptyCapPath;
	}else
		capPath = './' + req.files.cap.path; 




	var unlinker = {
		netlistPath: netlistPath,
		stdcellPath: stdcellPath,
		clkPath: clkPath,
		capPath: capPath,
		constrPath: constrPath,
		unlinkAll: function(){
			fs.unlink(this.stdcellPath); //Deleting uploaded file.
		    fs.unlink(this.netlistPath);
			fs.unlink(this.clkPath);
			fs.unlink(this.capPath);
			fs.unlink(this.constrPath);
		}
	};


	fs.readFile(stdcellPath, 'utf8', function(err, stdcellData){
		if(err){
				console.log(err);
				req.flash('error', 'Error while reading the standard cell file.');
		        res.redirect('/');
				unlinker.unlinkAll(); //Deleting all uploaded/created files.		   
				return;
		    }else{
		    	LibertyParser.parse(stdcellData, function(err, stdcells){
		    		if(err){
		    			console.log(err);
		    			req.flash('error', err);
		        		res.redirect('/');
		        		unlinker.unlinkAll(); //Deleting all uploaded/created files.
						return;
		    		}else{
		    			fs.readFile(capPath, 'utf8', function(err, capData){
		    				if(err){
				    			console.log(err);
				    			req.flash('error', 'Error while reading the net capacitances file.');
				        		res.redirect('/');
				        		unlinker.unlinkAll(); //Deleting all uploaded/created files.
						        return;
				    		}else{
				    			CapParser.parse(capData, function(err, caps){
				    				if(err){
						    			console.log(err);
						    			req.flash('error', err);
						        		res.redirect('/');
						        		unlinker.unlinkAll(); //Deleting all uploaded/created files.
		       							return;
						        	}else{
						        		fs.readFile(clkPath, 'utf8', function(err, clkData){
						        			if(err){
								    			console.log(err);
								    			req.flash('error', 'Error while reading the clock skews file.');
								        		res.redirect('/');
								        		unlinker.unlinkAll(); //Deleting all uploaded/created files.
		       									return;
								        	}else{
								        		ClockParser.parse(clkData, function(err, skews){
								        			if(err){
								        				console.log(err);
										    			req.flash('error', err);
										        		res.redirect('/');
										        		unlinker.unlinkAll(); //Deleting all uploaded/created files.
		       											return;
								        			}else{
								        				fs.readFile(constrPath, 'utf8', function(err, constrData){
								        					if(err){
								        						console.log(err);
												        		req.flash('error', 'Error while reading the constraints file.');
												        		res.redirect('/');
												        		unlinker.unlinkAll(); //Deleting all uploaded/created files.
		       													return;
								        					}else{
								        						ConstraintsParser.parse(constrData, function(err, constr){
								        							if(err){
								        								console.log(err);
																        req.flash('error', err);
																        res.redirect('/');
																        unlinker.unlinkAll(); //Deleting all uploaded/created files.
		       															return;
								        							}else{
								        								fs.readFile(netlistPath, 'utf8', function(err, netlistData){
												        					if(err){
												        						console.log(err);
																        		req.flash('error', 'Error while reading the netlist file.');
																        		res.redirect('/');
																        		unlinker.unlinkAll(); //Deleting all uploaded/created files.
		       																	return;
												        					}else{
												        						VerilogParser.parse(netlistData, stdcells, caps, skews, function(err, warnings, cells, wires){
												        							if(err){
														        						console.log(err);
																		    			req.flash('error', err);
																		        		res.redirect('/');
																		        		unlinker.unlinkAll(); //Deleting all uploaded/created files.
		       																			return;								
														        					}else{
														        						var StaticTimingAnalyser = new STA(cells, constr); // STA construction
														        						StaticTimingAnalyser.analyze();
														        						var report = StaticTimingAnalyser.generateTimingReport();



														        						var cells_content = stringify_cells(cells);
														        						var stdcells_content = stringify_std(stdcells.cells);
														        						var paths_report = StaticTimingAnalyser.generateTimingPathReport();


														        						

														        						res.render('report', {
															        											  title: 'Timing Report',
															        											  error: '',
															        											  warnings: JSON.stringify(warnings),
															        											  files_warnings: JSON.stringify(fileWarnings),
															        											  verilog_code: netlistData,
															        											  netlist_cells: cells_content,
															        											  stdcells: stdcells_content,
															        											  cell_reports: JSON.stringify(report.gates),
															        											  paths: stringify_paths(paths_report),
															        											  general_report: JSON.stringify(report.general),
															        											  verilog_name: req.files.netlist.originalname,
															        											  stdcell_name: req.files.stdcell.originalname,
														        											}
														        								);
														        						unlinker.unlinkAll(); //Deleting all uploaded/created files.
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
