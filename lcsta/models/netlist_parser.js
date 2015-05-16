"use strict";

var Cell = require('./cell').cell;
var Connect = require('./cell').connect;

function getModuleKeywordRegexRegex(identifier){
	return new RegExp('\\s*' + identifier + ' (\\w+)\\s*\\(?.*\\)?\\s*;\\s*', 'gm');
};

function getModuleRegex(stdcells){
	var cellNames = '(';
	var cellsArray = Object.keys(stdcells.cells);
	for(var i = 0; i < cellsArray.length; i++)
		if(i != cellsArray.length - 1)
			cellNames = cellNames + cellsArray[i] + '|';
		else
			cellNames = cellNames + cellsArray[i] + ')';
	return new RegExp('^\\s*' + cellNames + '\\s*(.+)\\s*\\(\\s*([\\s\\S]+)\\s*\\)\\s*$', 'm');
};

function getYosysCommentRegex(){
	return new RegExp('\\(\\*[\\s\\S]*?\\*\\)', 'gm');
};

function getWireRegex(){
	return new RegExp('^\\s*(input|wire|output)\\s*((\\w|\\\\.)+)\\s*$', 'm');
};

function getBusRegex(){
	return new RegExp('^\\s*(input|wire|output)\\s*\\[\\s*(\\d+)\\s*:\\s*(\\d+)\\s*\\]\\s*((\\w|\\\\.)+)\\s*$', 'm');
};

function getConstantRegex(){
	return new RegExp('(\\d+)\'([bBhHdD])(\\d+)', 'm');
};

function getParamRegex (){
	return new RegExp('\\s*\\.(\\w+)\\s*\\(\\s*(([\\w\\[\\]]|\\\\.|\\d+\'[bdhBDH]\\d+)+)\\s*\\)\\s*', 'm');
};

function getAssignRegex(){
	return new RegExp('\\s*assign\\s+(([\\w\\[\\]]|\\\\.)+)\\s*=\\s*(([\\w\\[\\]]|\\\\.)+)\\s*', 'm');
}

function getKeyRegex(key){
	key = key.replace(new RegExp('\\\\', 'm'), '\\\\');
	key = key.replace(new RegExp('\\.', 'm'), '\\.');
	key = key.replace(new RegExp('\\+', 'm'), '\\+');
	key = key.replace(new RegExp('\\*', 'm'), '\\*');
	key = key.replace(new RegExp('\\[', 'm'), '\\[');
	key = key.replace(new RegExp('\\(', 'm'), '\\(');
	key = key.replace(new RegExp('\\]', 'm'), '\\]');
	key = key.replace(new RegExp('\\)', 'm'), '\\)'); 
	return new RegExp('([\\s\\(\\[\\]\\)])\\s*' + key + '\\s*([\\s\\(\\[\\]\\))])', 'gm');
}


module.exports.parse = function(data, stdcells, caps, skews, callback){
	var endmoduleKeywordRegex = /endmodule/g; //RegEx: Capturing 'endmodule'.
	var commentRegex = /\/\/.*$/gm; //RegEx: Capturing comments RegEx.
	var mCommentRegex = /\/\*(.|[\r\n])*?\*\//gm; //RegEx: Capturing multi-line comments RegEx.
	var moduleKeywordRegex =  getModuleKeywordRegexRegex('module'); //RegEx: capturing module name.;
	var yosysCommentsRegex = getYosysCommentRegex(); //RegEx: capturing Yosys comments.

	data = data.replace(mCommentRegex, ''); //Removing multi-line comments.
	data = data.replace(commentRegex, ''); //Removing single line comments.
	data = data.replace(yosysCommentsRegex, '');
	data = data.trim();

	var endmoduleCount = (data.match(endmoduleKeywordRegex) || []).length; //Counting the occurences of 'endmodule'.
	var moduleCount = (data.match(moduleKeywordRegex) || []).length; //Counting the occurences of 'module'.
	var warnings = [];
	var busBases = {};
	var cells = {'vdd': new Cell('vdd', stdcells.cells['vdd'], stdcells),
				 'gnd': new Cell('gnd', stdcells.cells['gnd'], stdcells)};
	cells['vdd'].model = 'vdd';
	cells['gnd'].model = 'gnd';
	var wires = {'vdd_wire': {name: 'vdd_wire', direction: 'input', input: {port: 'Y', gate: cells.vdd}, outputs: [], type: 'dummy_wire', net_capacitance: 0},
				 'gnd_wire': {name: 'gnd_wire', direction: 'input', input: {port: 'Y', gate: cells.gnd}, outputs: [], type: 'dummy_wire', net_capacitance: 0}};
	if(endmoduleCount != 1 || moduleCount != 1){
		console.log('Invalid input');
		return callback('Invalid input.', null);
	}
	data = data.replace(endmoduleKeywordRegex, ''); //Removing 'endmodule'.
	var moduleName = moduleKeywordRegex.exec(data)[1];

	data = data.replace(moduleKeywordRegex, '').trim(); //Removing module name.
	var lines = data.split(';'); //Splitting data to instructions.

	
	/****Handling assgin****/
	var assignTable = {};
	
	for(var i = 0; i < lines.length; i++){
		lines[i] = lines[i].trim();
		var assignRegex = getAssignRegex();
		if(assignRegex.test(lines[i])){
			var matchedGroups = assignRegex.exec(lines[i]);
			assignTable[matchedGroups[1]] = matchedGroups[3];
			lines.splice(i--, 1);
		}
	}

	for(var i = 0; i < lines.length; i++){
		for(var key in assignTable){
			var keyRegx = getKeyRegex(key);
			var matches = keyRegx.exec(lines[i]);
			if(matches != null)
				lines[i] = lines[i].replace(getKeyRegex(key), matches[1] + assignTable[key] + matches[2]);
		}
	}

	lines.forEach(function(line){
		var wireRegex = getWireRegex();
		var busRegex = getBusRegex();
		var moduleRegex = getModuleRegex(stdcells);

		if(wireRegex.test(line)){
			var matchedGroups = wireRegex.exec(line);
			var wireDirection = matchedGroups[1];
			var wireName = matchedGroups[2];

			if (typeof wires[wireName] !== 'undefined'){
				console.log('Redeclaration of the wire ' + wireName);
				warnings.push('Redeclaration of the wire ' + wireName);
			}

			var netCap;
			if(typeof caps[wireName] !== undefined)
				netCap = caps[wireName];
			else
				netCap = 0;

			wires[wireName] = {
				name: wireName,
				direction: wireDirection,
				input: {},
				outputs: [],
				type: 'wire',
				net_capacitance: 0
			};

			if (wireDirection == 'input'){
				cells['___input_' + wireName] = new Cell('___input_' + wireName, stdcells.cells.input, stdcells);
				wires[wireName].input = {port: 'Y', gate: cells['___input_' + wireName]};
			}else if (wireDirection == 'output'){
				cells['___output_' + wireName] = new Cell('___output_' + wireName, stdcells.cells.output, stdcells);
				wires[wireName].outputs.push({port: 'A', gate: cells['___output_' + wireName]});
			}

		}

		if (busRegex.test(line)){/****End of if wireRegex.test***/
			var matchedGroups = busRegex.exec(line);
			var wireDirection = matchedGroups[1];
			var MSB = parseInt(matchedGroups[2]);
			var LSB = parseInt(matchedGroups[3]);
			var wireBase = matchedGroups[4];
			if(LSB > MSB){
				var temp = LSB;
				LSB = MSB;
				MSB = temp;
			}

			if (typeof busBases[wireBase] !== 'undefined'){
					console.log('Redeclaration of the bus ' + wireBase);
					warnings.push('Redeclaration of the bus ' + wireBase);
			}

			busBases[wireBase] = {
				name: wireBase,
				direction: wireDirection
			}

			for(var i = LSB; i <= MSB; i++){
				var wireName = wireBase + '[' + i + ']';
				if (typeof wires[wireName] !== 'undefined'){
					console.log('Redeclaration of the wire ' + wireName);
					warnings.push('Redeclaration of the wire ' + wireName);
				}

				var netCap;
				if(typeof caps[wireName] !== undefined)
					netCap = caps[wireName];
				else
					netCap = 0;

				wires[wireName] = {
					name: wireName,
					direction: wireDirection,
					input: {},
					outputs: [],
					type: 'bus',
					net_capacitance: netCap
				};

				if (wireDirection == 'input'){
					cells['___input_' + wireName] = new Cell('___input_' + wireName, stdcells.cells.input, stdcells);
					wires[wireName].input = {port: 'A', gate: cells['___input_' + wireName]};
				}else if (wireDirection == 'output'){
					cells['___output_' + wireName] = new Cell('___output_' + wireName, stdcells.cells.output, stdcells);
					wires[wireName].outputs.push({port: 'A', gate: cells['___output_' + wireName]});
				}
			}
		}else if(moduleRegex.test(line)){/****End of if busRegex.test***/
			var matchedGroups = moduleRegex.exec(line);
			var cellDefName = matchedGroups[1].trim();
			var cellDef = stdcells.cells[cellDefName];
			var cellName = matchedGroups[2].trim();
			var rawParams = matchedGroups[3].trim();
			cells[cellName] = new Cell(cellName, cellDef, stdcells);
			cells[cellName].model = cellDefName;
			var paramsList = rawParams.split(',');
			for(var i = 0; i < paramsList.length; i++){
				paramsList[i] = paramsList[i].trim();
				var paramConnections = getParamRegex().exec(paramsList[i]);
				var targetPort = paramConnections[1].trim();
				var connectionWire = paramConnections[2].trim();
				if(getConstantRegex().test(connectionWire)){
					wires['vdd_wire'].outputs.push({port: targetPort, gate: cells[cellName]});
				}else{
					if(typeof wires[connectionWire] === 'undefined'){
						console.log('Undefined wire ' + connectionWire);
						warnings.push('Undefined wire ' + connectionWire);
					}
					if(cellDef.pins[targetPort].direction == 'input'){
						wires[connectionWire].outputs.push({port: targetPort, gate: cells[cellName]});
					}else if (cellDef.pins[targetPort].direction == 'output'){
						wires[connectionWire].input = {port: targetPort, gate: cells[cellName]};
					}else{
						console.log('Unkown pin direction for pin ' + targetPort);
					}
				}
			}
		}/***End of moduleRegex.test.***/

	}); /****End of lines.forEach*****/


	/****Completing assign handling****/
	for(var key in assignTable){
		if(wires[key].direction === 'output' && wires[assignTable[key]].direction === 'input'){
			for(var i = 0; i < wires[key].outputs.length; i++){
				wires[assignTable[key]].outputs.push(wires[key].outputs[i]);
			}
			wires[key] = undefined;
		}
	}
	
	/****Connecting Extracted Gates****/
	for(var key in wires){
		if(wires[key] != undefined)
			for(var i = 0; i < wires[key].outputs.length; i++){
				if(Object.keys(wires[key].input).length === 0 || typeof(wires[key].outputs[i]) === undefined || Object.keys(wires[key].outputs[i]).length === 0){
					console.log('Flying wire ' + key);
					warnings.push('Flying wire ' + key);
				}else{
					Connect(wires[key].input.gate, wires[key].outputs[i].gate, wires[key].outputs[i].port, wires[key].net_capacitance);
				}
			}
	}

	for(var key in cells){
		if(cells[key].isFF()){
			if(typeof skews !== 'undefined' && typeof skews[key] !== 'undefined')
				cells[key].clock_skew = skews[key];
			else
				cells[key].clock_skew = 0;
		}	
	}
	

	callback(null, cells, wires);
}