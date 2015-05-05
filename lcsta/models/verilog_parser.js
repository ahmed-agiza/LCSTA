/*Netlist Parser Model*/

var Component = require('./component');
var component = Component.component;
var wire = Component.wire;
var and = Component.and;
var nand = Component.nand;
var or =Component.or;
var nor = Component.nor;
var xor = Component.xor;
var xnor = Component.xnor;
var not = Component.not;
var buf = Component.buf;
var jun = Component.junction;
var inputPort = Component.input;
var outputPort = Component.output;
var WireType = Component.WireType;
var VerilogToJointMap = Component.VerilogToJointMap;
var PremEDIF = Component.PremEDIF;
var EDIF;


function getGatesRegEx(){
	var gates = "";
	var models = [];
	for(model in EDIF){
		models.push('' + model);
	}
	for(var i = 0; i < models.length; i++){
		gates = gates + models[i];
		if(i < models.length - 1)
			 gates = gates + "|";
	}
	return new RegExp('^\\s*(' + gates + ')\\s+(\\S+)\\s*\\(([\\(\\[\\)\\],\\S\\s\\.\\w\\r\\n\\)]*)\\)\\s*$', 'gm');
}

function getPrimRegEx(){
	var gates = "";
	var models = ['and', 'nand', 'or', 'nor', 'xor', 'xnor', 'dff', 'not', 'buf'];

	for(var i = 0; i < models.length; i++){
		gates = gates + models[i];
		if(i < models.length - 1)
			 gates = gates + "|";
	}
	return new RegExp('^\\s*(' + gates + ')\\s*\\(\\s*(.*)?\\s*\\)\s*', 'gm');
}

function getWireRegEx(identifier){
	return new RegExp('^\\s*' + identifier + '\\s+(\\S+)\\s*$', 'gm');
}

function getBusRegEx(identifier){
	return new RegExp('^\\s*' +  identifier + '\\s+\\[\\s*(\\d+)\\s*:\\s*(\\d+)\\s*\\]\\s*(\\S+)\\s*$', 'gm');
}

function getParamRegEx(){
	return new RegExp('^\\s*\\.(\\S+)\\(\\s*(.*)\\s*\\)\\s*$', 'gm');
}

function getAssignRegEx(){
	return new RegExp('\\s*assign\\s*(\\S+)\\s*=\\s*(\\S+)\\s*', 'gm');
}

function getAssignReplaceRegEx(wn){
	wn = wn.replace(new RegExp('\\\\', 'm'), '\\\\');
	wn = wn.replace(new RegExp('\\.', 'm'), '\\.');
	wn = wn.replace(new RegExp('\\+', 'm'), '\\+');
	wn = wn.replace(new RegExp('\\*', 'm'), '\\*');
	wn = wn.replace(new RegExp('\\[', 'm'), '\\[');
	wn = wn.replace(new RegExp('\\(', 'm'), '\\(');
	wn = wn.replace(new RegExp('\\]', 'm'), '\\]');
	wn = wn.replace(new RegExp('\\)', 'm'), '\\)');
	return new RegExp('([ \\(])\\s*' + wn + '\\s*([ \\)])', 'gm');
}

function getCellDefineRegEx(){
	return new RegExp('\\s*`celldefine([\\s\\S]+?)`endcelldefine\\s*', '');
}

function getSpecifyRegEx(){
	return new RegExp('\\s*specify[\\s\\S]*?endspecify\\s*', '');
}

function getPrimGate(primLine){
	primLine = primLine.trim();
	var prem = {inputs: [],
				outputs: [],
				gate: {}};

	var primRegex = getPrimRegEx();
	
	if (!primRegex.test(primLine)){
		console.log('Unkown primitive ' + primLine);
		return prem;
	}else{
		primRegex = getPrimRegEx();
		var primComponentes = primRegex.exec(primLine);
		var primName = primComponentes[1];
		var params = primComponentes[2].split(/\s*,\s*/gm);
		prem.outputs.push(params[0]);
		for (var i = 1; i < params.length; i++){
			prem.inputs.push(params[i]);
		}
		var newGate = new Component[primName]('P_' + primName);
		prem.gate = newGate;

		return prem;
	}
}



module.exports.parseLibrary = function(content, callback){

	var commentRegex = /\/\/.*$/gm; //RegEx: Capturing comments RegEx.
	var mCommentRegex = /\/\*(.|[\r\n])*?\*\//gm; //RegEx: Capturing multi-line comments RegEx.
	content = content.replace(mCommentRegex, ''); //Removing multi-line comments.
	content = content.replace(commentRegex, ''); //Removing single line comments.

	var parsedEdif = {};
	var timescaleRegex = /\s*`\s*timescale.*$/gm;
	content = content.replace(timescaleRegex, '').trim();

	var cellsDefinitions = {};
	var cellDefineRegEx = getCellDefineRegEx();
	while(cellDefineRegEx.test(content)){
		cellDefineRegEx = getCellDefineRegEx();
		var cell = cellDefineRegEx.exec(content)[1].trim();

		var endmoduleRegex = /\s*endmodule\s*/g;
		var moduleRegex = /\s*module (\w+)\s*\(?.*\)?\s*;\s*/gm;

		var endmoduleCount = (cell.match(endmoduleRegex) || []).length; //Counting the occurences of 'endmodule'.
		//console.log(endmoduleCount);

		var moduleCount = (cell.match(moduleRegex) || []).length; //Counting the occurences of 'module'.
		//console.log(moduleCount);

		var warnings = [];

		if(endmoduleCount != 1 || moduleCount != 1){
			console.log('Invalid input');
			return callback('Error while parsing the module ' + moduleName, null);
		}
		cell = cell.replace(endmoduleRegex, ''); //Removing 'endmodule'.

		var moduleName = moduleRegex.exec(cell)[1];		
		cell = cell.replace(moduleRegex, ''); //Removing module name.

		var specifyRegex = getSpecifyRegEx();
		cell = cell.replace(specifyRegex, '');

		cellsDefinitions[moduleName] = cell;
		content = content.replace(getCellDefineRegEx(), '');
		cellDefineRegEx = getCellDefineRegEx();
	}
	for (key in cellsDefinitions){
		var currentCell = cellsDefinitions[key];
		var defLines = currentCell.split(/\s*;\s*/gm);
		for(var i = 0; i < defLines.length; i++){
			defLines[i] = defLines[i].trim();
			if (defLines[i] == '')
				defLines.splice(i--, 1);
		}

		var cellInputs = {};
		var cellOutputs = {};
		var cellInternalWires = {};

		var cellObject = {name: key,
						  inputPorts: [],
						  outputPorts: []
						};

		for(var i = 0; i < defLines.length; i++){
			var wireRegex = getWireRegEx('wire'); //RegEx: Capturing wire.
			var inputRegex = getWireRegEx('input'); //RegEx: Capturing input.
			var outputRegex = getWireRegEx('output'); //RegEx: Capturing output.
			var primRegex = getPrimRegEx();
			if (wireRegex.test(defLines[i])){
				var wireRegex = getWireRegEx('wire');
				var wireName = wireRegex.exec(defLines[i])[1];
				console.log('Wires in library are not supported yet');
				cellInternalWires[wireName] = new wire(WireType.CONNECTION);
			}else if (inputRegex.test(defLines[i])){
				var inputRegex = getWireRegEx('input');
				var wireName = inputRegex.exec(defLines[i])[1];
				cellObject.inputPorts.push(wireName);
				cellInputs[wireName] = new wire(WireType.INPUT);
			}else if (outputRegex.test(defLines[i])){
				var outputRegex = getWireRegEx('output');
				var wireName = outputRegex.exec(defLines[i])[1];
				cellObject.outputPorts.push(wireName);
				cellOutputs[wireName] = new wire(WireType.OUTPUT);
			}else if (primRegex.test(defLines[i])){
				if (i != defLines.length - 1){
					
					cellObject.defLines = [];
					for(var z = i; z < defLines.length; z++)
						cellObject.defLines.push(defLines[z]);
					cellObject.compound = true;
					cellObject.primitive = 'compound';
					cellObject.getComponent = function(cb){return (function(cbb, co){
						var interComponents = {};
						var interGates = [];
						for(var z = 0; z < co.defLines.length; z++){
							var newInterComponent = getPrimGate(co.defLines[z]);
							for(var x = 0; x < newInterComponent.inputs.length; x++){
								if(typeof(cellInputs[newInterComponent.inputs[x]]) === 'undefined' &&
								   typeof(cellOutputs[newInterComponent.inputs[x]]) === 'undefined' &&
								   typeof(cellInternalWires[newInterComponent.inputs[x]]) === 'undefined'){
									var newInputWire = new wire(WireType.CONNECTION);
									newInputWire.addOutput(newInterComponent.gate.id);
									newInterComponent.gate.addInput(newInputWire.id);
									cellInternalWires[newInterComponent.inputs[x]] = newInputWire;
								}else if (typeof(cellInputs[newInterComponent.inputs[x]]) === 'undefined' &&
								   typeof(cellOutputs[newInterComponent.inputs[x]]) === 'undefined' &&
								   typeof(cellInternalWires[newInterComponent.inputs[x]]) !== 'undefined'){
									var currentWire = cellInternalWires[newInterComponent.inputs[x]];
									currentWire.addOutput(newInterComponent.gate.id);
									newInterComponent.gate.addInput(currentWire.id);
									cellInternalWires[newInterComponent.inputs[x]] = currentWire;
								}
							}
							for(var x = 0; x < newInterComponent.outputs.length; x++){
								if(typeof(cellInputs[newInterComponent.outputs[x]]) === 'undefined' &&
								   typeof(cellOutputs[newInterComponent.outputs[x]]) === 'undefined' &&
								   typeof(cellInternalWires[newInterComponent.outputs[x]]) === 'undefined'){
									var newInputWire = new wire(WireType.CONNECTION);
									newInputWire.setInput(newInterComponent.gate.id);
									newInterComponent.gate.addOutput(newInputWire.id);
									cellInternalWires[newInterComponent.outputs[x]] = newInputWire;
								}else if (typeof(cellInputs[newInterComponent.outputs[x]]) === 'undefined' &&
								   typeof(cellOutputs[newInterComponent.outputs[x]]) === 'undefined' &&
								   typeof(cellInternalWires[newInterComponent.outputs[x]]) !== 'undefined'){
									var currentWire = cellInternalWires[newInterComponent.outputs[x]];
									currentWire.setInput(newInterComponent.gate.id);
									newInterComponent.gate.addOutput(currentWire.id);
									cellInternalWires[newInterComponent.outputs[x]] = currentWire;
								}
							}
							interComponents[newInterComponent.gate.id] = newInterComponent;
						}
						
						for(var l = 0; l < cellObject.inputPorts.length; l++){
							var hasInput = false;
							var bufPlaced = false;
							var inBuf;
							var inBufWire;
							var inBufWireName;
							var firstComponentKey;
							for(var j in interComponents){
								if(interComponents[j].inputs.indexOf(cellObject.inputPorts[l]) != -1){
									if(!hasInput){
										hasInput = true;
										firstComponentKey = j;
									}else{
										var inGate = interComponents[j].gate;
										if(!bufPlaced){
											bufPlaced = true;
											inBuf = new jun('P_jun');
											inBufWire = new wire(WireType.CONNECTION);
											inBufWireName = 'buf_connection'  + Date.now();

											inBufWire.setInput(inBuf.id);
											inBuf.addOutput(inBufWire.id);

											var firstGate = interComponents[firstComponentKey].gate;

											inBufWire.addOutput(firstGate.id);
											firstGate.addInput(inBufWire.id);

											inBufWire.addOutput(inGate.id);
											inGate.addInput(inBufWire.id);

											cellInternalWires[inBufWireName] = inBufWire;
											interComponents[j].gate = inGate;
											interComponents[firstComponentKey].gate = firstGate;
										}else{
											inBufWire.addOutput(inGate.id);
											inGate.addInput(inBufWire.id);
											cellInternalWires[inBufWireName] = inBufWire;
											interComponents[j].gate = inGate;
										}
									}
								}
							}
							if (bufPlaced)
								interGates.push(inBuf);
								
						}
						
						for(var k in interComponents){
							interGates.push(interComponents[k].gate);
						}
						cbb(interGates, cellInternalWires);
					})(cb, this)};
					break;
				}else{
					var primRegex = getPrimRegEx();
					var primName = primRegex.exec(defLines[i])[1];
					cellObject['primitive'] = primName;
				}
			}else{
				console.log('Invalid line ' + defLines[i]);
				return callback('Invalid line ' + defLines[i] + '.', null);
			}
		}
		parsedEdif[key] = cellObject;

	}

	parsedEdif.getJointMap = function(){
		var map = {};
		for (var kk in parsedEdif){
			if (kk == 'getJointMap' || parsedEdif[kk].primitive == 'compound')
				continue;
			map[kk]= VerilogToJointMap[parsedEdif[kk].primitive];
		}
		for (var kk in PremEDIF){
			if (kk == 'getJointMap')
				continue;
			map[kk]= VerilogToJointMap[PremEDIF[kk].primitive];
		}
		map['InputPort'] = VerilogToJointMap['InputPort'];
		map['OutputPort'] = VerilogToJointMap['OutputPort'];
		return map;
	}


	callback(null, parsedEdif);
};



module.exports.parseNetlist = function parse(content, EDIFContent, callback){ //Netlist parsing function.
	var endmoduleRegex = /endmodule/g; //RegEx: Capturing 'endmodule'.
	var commentRegex = /\/\/.*$/gm; //RegEx: Capturing comments RegEx.
	var mCommentRegex = /\/\*(.|[\r\n])*?\*\//gm; //RegEx: Capturing multi-line comments RegEx.
	var moduleRegex =  /\s*module (\w+)\s*\(?.*\)?\s*;\s*/gm; //RegEx: capturing module name.;

	EDIF = EDIFContent;

	content = content.replace(mCommentRegex, ''); //Removing multi-line comments.
	content = content.replace(commentRegex, ''); //Removing single line comments.
	
	var endmoduleCount = (content.match(endmoduleRegex) || []).length; //Counting the occurences of 'endmodule'.

	var moduleCount = (content.match(moduleRegex) || []).length; //Counting the occurences of 'module'.

	var warnings = [];

	if(endmoduleCount != 1 || moduleCount != 1){
		console.log('Invalid input');
		return callback('Invalid input.', null, null, null);
	}
	content = content.replace(endmoduleRegex, ''); //Removing 'endmodule'.
	var moduleName = moduleRegex.exec(content)[1];

	content = content.replace(moduleRegex, ''); //Removing module name.
	var lines = content.split(';'); //Splitting data to instructions.

	var wires = [];
	var inputs = [];
	var outputs = [];
	var gates = [];

	var handleAssign = function(){
		//console.log(gates);
		for(var i = 0; i < lines.length; i++){
			lines[i] = lines[i].trim();
			var assignRegex = getAssignRegEx();
			if (assignRegex.test(lines[i])){
					console.log('Assign: ' + lines[i]);
					var assignRegex = getAssignRegEx();
					var sides = assignRegex.exec(lines[i]);
					var lhs = sides[1];
					var rhs = sides[2];
					var lhsWire;
					var rhsWire;
					var isLConnection = false;
					var isLInput = false;
					var isLOutput = false;
					var isRConnection = false;
					var isRInput = false;
					var isROutput = false;
					if (typeof(wires[lhs]) !== 'undefined'){
						isLConnection = true;
						lhsWire = wires[lhs];
					}else if (typeof(inputs[lhs]) !== 'undefined'){
						isLInput = true;
						lhsWire = inputs[lhs];
					}else if (typeof(outputs[lhs]) !== 'undefined'){
						isLOutput = true;
						lhsWire = outputs[lhs];
					}else{
						console.log('Warning, undefined wire ' + lhs);
						warnings.push('Warning, undefined wire ' + lhs + '.');
						continue;
					}

					if (typeof(wires[rhs]) !== 'undefined'){
						isRConnection = true;
						rhsWire = wires[rhs];
					}else if (typeof(inputs[rhs]) !== 'undefined'){
						isRInput = true;
						rhsWire = inputs[rhs];
					}else if (typeof(outputs[rhs]) !== 'undefined'){
						isROutput = true;
						rhsWire = outputs[rhs];
					}else{
						console.log('Warning, undefined wire ' + rhs);
						warnings.push('Warning, undefined wire ' + rhs + '.');
						continue;
					}

					if(lhsWire.type != WireType.CONNECTION && rhsWire.type != WireType.CONNECTION){
							if (lhsWire.type == WireType.INPUT){
								console.log('Cannot assign to input wire');
								warnings.push('Warning, cannot assign wire ' + rhs + 'to input wire ' + lhs);
								continue;
							}else if (rhsWire.type == WireType.OUTPUT){
								//console.log('Output to Output');
								var outputGate = component.gates[lhsWire.outPorts[0]];
								outputGate.clearInputs();
								outputGate.addInput(rhsWire.id);
								rhsWire.addOutput(outputGate.id);
								if (isLInput){
									delete inputs[lhs];
									delete component.wires[lhs];
								}else if (isLOutput){
									delete outputs[lhs];
									delete component.wires[lhs];
								}else if (isLConnection){
									delete wires[lhs];
									delete component.wires[lhs];
								}else
									console.log('Unkown wire type ' + lhsWire);
							}else if(rhsWire.type == WireType.INPUT){
								//console.log('Input to Output');
								var outputGate = component.gates[lhsWire.outPorts[0]];
								outputGate.clearInputs();
								outputGate.addInput(rhsWire.id);
								rhsWire.addOutput(outputGate.id);
								console.log(outputGate);
								if (isLInput){
									delete inputs[lhs];
									delete component.wires[lhs];
								}else if (isLOutput){
									delete outputs[lhs];
									delete component.wires[lhs];
								}else if (isLConnection){
									delete wires[lhs];
									delete component.wires[lhs];
								}else
									console.log('Unkown wire type ' + lhsWire);
							}else
								console.log('Invalid assign');
					}else if (lhsWire.type == WireType.CONNECTION){
							//console.log('Wire <- Input/Output');
							for(var j = 0; j < lines.length; j++){
								if (j == i)
									continue;
								else{
									//var before =  lines[j]; 
									var replacementRegex = getAssignReplaceRegEx(lhs);
									lines[j] = lines[j].replace(replacementRegex, '$1' + rhs + '$2');
									//if (before != lines[j])
										//console.log('Replaced ' + before + ' with ' + lines[j]);
								}
							}
					}else if (rhsWire.type == WireType.CONNECTION){
							//console.log('Output <- Wire ');
							//console.log(lhsWire);
							if (lhsWire.type != WireType.OUTPUT){
								console.log('Cannot assign to input wire');
								warnings.push('Warning, cannot assign wire ' + rhs + 'to input wire ' + lhs);
								continue;
							}
							var outputGate = component.gates[lhsWire.outPorts[0]];
							outputGate.clearInputs();
							outputGate.addInput(rhsWire.id);
							rhsWire.addOutput(outputGate.id);
							console.log(outputGate);
							if (isLInput){
								delete inputs[lhs];
								delete component.wires[lhs];
							}else if (isLOutput){
								delete outputs[lhs];
								delete component.wires[lhs];
							}else if (isLConnection){
								delete wires[lhs];
								delete component.wires[lhs];
							}else
								console.log('Unkown wire type ' + lhsWire);

					}else{
							console.log('Error at ' + lhs + ':' + lhsWire+ '\n' + rhs + ':' + rhsWire);
					}
						
				lines.splice(i--, 1);
			}
		}
	}

	var ff = -1;	
	for(var i = 0; i < lines.length; i++){ //Parsing wires.

		ff++;
		lines[i] = lines[i].trim();
		if (lines[i] == '')
			continue;

		var wireRegex = getWireRegEx('wire'); //RegEx: Capturing wire.
		var busRegex = getBusRegEx('wire'); //RegEx: Capturing bus.
		var inputRegex = getWireRegEx('input'); //RegEx: Capturing input.
		var inputBusRegex =  getBusRegEx('input'); //RegEx: Capturing input bus.
		var outputRegex = getWireRegEx('output'); //RegEx: Capturing output.
		var outputBusRegex = getBusRegEx('output'); //RegEx: Capturing output bus.


		if (busRegex.test(lines[i])){ //Parsing bus.
			var busRegex = getBusRegEx('wire');
			var bus = busRegex.exec(lines[i]);
			var busMSB = parseInt(bus[1]);
			var busLSB = parseInt(bus[2]);
			var busName = bus[3];
			if (Object.prototype.hasOwnProperty(busName) || Array.prototype.hasOwnProperty(busName)){
				console.log(busName +' conflicting with prototype, replcaing..');
				for(var x = i; x < lines.length; x++)
					lines[x] = lines[x].replace(new RegExp('\\b' + busName + '\\b', 'gm'), busName + '__').trim();
				busName = busName + '__';
			}
			if(busLSB == busMSB){
				console.log('Parsing error, invalid bus length' + busMSB + ':' + busLSB);
				return callback('Parsing error, invalid bus length' + busMSB + ':' + busLSB, null, null, null);
			}else if (busLSB < busMSB){
				for(j = busLSB; j <= busMSB; j++){
					var wireName = busName + '[' + j + ']';
					if (typeof wires[wireName] === 'undefined'){ //Checking for double declaration.
						wires [wireName] = new wire();
						//console.log('Captured wire: ' + wireName);
					}else{
						console.log('Parsing error, duplicate declaration ' + wireName);
						console.log(lines[i]);
						console.log(i);
						return callback('Parsing error, duplicate declaration '  + wireName , null, null, null);
					}
				}
			}else if (busLSB > busMSB){
				for(j = busMSB; j <= busLSB; j++){
					var wireName = busName + '[' + j + ']';
					if (typeof wires[wireName] === 'undefined'){ //Checking for double declaration.
						wires [wireName] = new wire();
						//console.log('Captured wire: ' + wireName);
					}else{
						console.log('Parsing error, duplicate declaration ' + wireName);
						console.log(lines[i]);
						return callback('Parsing error, duplicate declaration ' + wireName, null, null, null);
					}
				}
			}
			console.log('Bus [' + busMSB + ':' + busLSB + '] ' + busName);
		}else if (inputBusRegex.test(lines[i])){ //Parsing input bus.
			var inputBusRegex =  getBusRegEx('input');
			var bus = inputBusRegex.exec(lines[i]);
			var busMSB = parseInt(bus[1]);
			var busLSB = parseInt(bus[2]);
			var busName = bus[3];
			if (Object.prototype.hasOwnProperty(busName) || Array.prototype.hasOwnProperty(busName)){
				console.log(busName +' conflicting with prototype, replcaing..');
				for(var x = i; x < lines.length; x++)
					lines[x] = lines[x].replace(new RegExp('\\b' + busName + '\\b', 'gm'), busName + '__').trim();
				busName = busName + '__';
			}

			if(busLSB == busMSB){
				console.log('Parsing error, invalid input bus length ' + busMSB + ':' + busLSB);
				return callback('Parsing error, invalid input bus length ' + busMSB + ':' + busLSB, null, null, null);
			}else if (busLSB < busMSB){
				for(j = busLSB; j <= busMSB; j++){
					var wireName = busName + '[' + j + ']';
					if (typeof inputs[wireName] === 'undefined'){ //Checking for double declaration.
						var newInput = new inputPort();
						inputs [wireName] = new wire(WireType.INPUT, newInput.id);
						newInput.addOutput(inputs[wireName].id);
						gates.push(newInput);
						//console.log('Captured input: ' + wireName);
					}else{
						console.log('Parsing error, duplicate declaration ' + wireName);
						console.log(lines[i]);
						return callback('Parsing error, duplicate declaration ' + wireName, null, null, null);
					}
				}
			}else if (busLSB > busMSB){
				for(j = busMSB; j <= busLSB; j++){
					var wireName = busName + '[' + j + ']';
					if (typeof inputs[wireName] === 'undefined'){ //Checking for double declaration.
						var newInput = new inputPort();
						inputs [wireName] = new wire(WireType.INPUT, newInput.id);
						newInput.addOutput(inputs[wireName].id);
						gates.push(newInput);
						//console.log('Captured wire: ' + wireName);
					}else{
						console.log('Parsing error, duplicate declaration ' + wireName);
						console.log(lines[i]);
						console.log('A ' + i);
						return callback('Parsing error, duplicate declaration ' + wireName, null, null, null);
					}
				}
			}
			//console.log('Input Bus [' + busMSB + ':' + busLSB + '] ' + busName);

		}else if (outputBusRegex.test(lines[i])){ //Parsing output bus.
			var outputBusRegex =  getBusRegEx('output');
			var bus = outputBusRegex.exec(lines[i]);
			var busMSB = parseInt(bus[1]);
			var busLSB = parseInt(bus[2]);
			var busName = bus[3];
			if (Object.prototype.hasOwnProperty(busName) || Array.prototype.hasOwnProperty(busName)){
				console.log(busName +' conflicting with prototype, replcaing..');
				for(var x = i; x < lines.length; x++)
					lines[x] = lines[x].replace(new RegExp('\\b' + busName + '\\b', 'gm'), busName + '__').trim();
				
				busName = busName + '__';
			}

			if(busLSB == busMSB){
				console.log('Parsing error, invalid output bus length ' + busMSB + ':' + busLSB);
				return callback('Parsing error, invalid output bus length ' + busMSB + ':' + busLSB, null, null, null);
			}else if (busLSB < busMSB){
				for(j = busLSB; j <= busMSB; j++){
					var wireName = busName + '[' + j + ']';
					if (typeof outputs[wireName] === 'undefined'){ //Checking for double declaration.
						var newOutput = new outputPort();
						outputs [wireName] = new wire(WireType.OUTPUT, '', [newOutput.id]);
						newOutput.addInput(outputs[wireName].id);
						gates.push(newOutput);						//console.log('Captured output: ' + wireName);
					}else{
						console.log('Parsing error, duplicate declaration ' + wireName);
						console.log(lines[i]);
						console.log('B ' + i);
						return callback('Parsing error, duplicate declaration ' + wireName, null, null, null);
					}
				}
			}else if (busLSB > busMSB){
				for(j = busMSB; j <= busLSB; j++){
					var wireName = busName + '[' + j + ']';
					if (typeof outputs[wireName] === 'undefined'){ //Checking for double declaration.
						var newOutput = new outputPort();
						outputs [wireName] = new wire(WireType.OUTPUT, '', [newOutput.id]);
						newOutput.addInput(outputs[wireName].id);
						gates.push(newOutput);
							//console.log('Captured output: ' + wireName);
					}else{
						console.log('Parsing error, duplicate declaration ' + wireName);
						console.log(lines[i]);
						console.log('C ' + i);
						return callback('Parsing error, duplicate declaration ' + wireName, null, null, null);
					}
				}
			}
		}else if (wireRegex.test(lines[i])){ //Parsing single wire.
			var wireRegex = getWireRegEx('wire');
			var wireName = wireRegex.exec(lines[i])[1];
			if (Object.prototype.hasOwnProperty(wireName) || Array.prototype.hasOwnProperty(wireName)){
				console.log(wireName +' conflicting with prototype, replcaing..');
				for(var x = i; x < lines.length; x++)
					lines[x] = lines[x].replace(new RegExp('\\b' + wireName + '\\b', 'gm'), wireName + '__').trim();
				wireName = wireName + '__';
			}
			if (typeof wires[wireName] === 'undefined'){ //Checking for double declaration.
				wires [wireName] = new wire();
				//console.log('Captured wire: ' + wireName);
			}else{
				console.log('Parsing error, duplicate declaration ' + wireName);
				/*console.log('0000WIRES00000');
				for(key in wires){
					if(new RegExp('\\s*_\\d+_\\s*', '').test(key))
						continue;
					console.log(key + ':');
					console.log(wires[key]);
				}
				console.log('0000ENDWIRES0000');*/
				console.log(i + ' ' + lines[i]);
				console.log('AA ' + ff);
				return callback('Parsing error, duplicate declaration ' + wireName, null, null, null);
			}
		}else if (inputRegex.test(lines[i])){ //Parsing input wire.
			var inputRegex = getWireRegEx('input');
			var wireName = inputRegex.exec(lines[i])[1];
			if (Object.prototype.hasOwnProperty(wireName) || Array.prototype.hasOwnProperty(wireName)){
				console.log(wireName +' conflicting with prototype, replcaing..');
				for(var x = i; x < lines.length; x++)
					lines[x] = lines[x].replace(new RegExp('\\b' + wireName + '\\b', 'gm'), wireName + '__').trim();
				wireName = wireName + '__';
			}
			if (typeof wires[wireName] === 'undefined'){ //Checking for double declaration.
				var newInput = new inputPort();
				inputs [wireName] = new wire(WireType.INPUT, newInput.id);
				newInput.addOutput(inputs[wireName].id);
				gates.push(newInput);
				//console.log('Captured input: ' + wireName);
			}else{
				console.log('Parsing error, duplicate declaration ' + wireName);
				console.log(i + ' ' + lines[i]);
				console.log('BB ' + i);
				return callback('Parsing error, duplicate declaration ' + wireName, null, null, null);
			}
		}else if (outputRegex.test(lines[i])){ //Parsing output wire.
			var outputRegex = getWireRegEx('output');
			var wireName = outputRegex.exec(lines[i])[1];
			if (Object.prototype.hasOwnProperty(wireName) || Array.prototype.hasOwnProperty(wireName)){
				console.log(wireName +' conflicting with prototype, replcaing..');
				for(var x = i; x < lines.length; x++){
					lines[x] = lines[x].replace(new RegExp('\\b' + wireName + '\\b', 'gm'), wireName + '__').trim();
				}
				wireName = wireName + '__';
			}
			if (typeof outputs[wireName] === 'undefined'){ //Checking for double declaration.
					var newOutput = new outputPort();
					outputs [wireName] = new wire(WireType.OUTPUT,'',[newOutput.id]);
					newOutput.addInput(outputs[wireName].id);
					gates.push(newOutput);
				//console.log('Captured output: ' + wireName);
			}else{
				console.log('Parsing error, duplicate declaration ' + wireName);
				console.log(i + ' ' + lines[i]);
				console.log('CC ' + i);
				return callback('Parsing error, duplicate declaration ' + wireName, null, null, null);
			}
		}else 
			break;
		lines.splice(i--, 1);
		
	}

	handleAssign();

	for(var i = 0; i < lines.length; i++){ //Parsing gates.
		lines[i] = lines[i].trim();
		if (lines[i] == '')
			continue;
		var gatesRegex = getGatesRegEx(); //RegEx: Capturing logical gate.
		if (gatesRegex.test(lines[i])){ //Parsing modules.
			var moduleInstance = lines[i];
			moduleInstance = moduleInstance.trim().replace(/\r\n/g, '').trim(); //Stripping module.
			var gatesRegex = getGatesRegEx(); 
			var gateComponents = gatesRegex.exec(moduleInstance); //Geting module tokens.
			var instanceModel = gateComponents[1].trim(); //Gate model.
			var instanceName = gateComponents[2].trim(); //Module name.
			var gateConnections = gateComponents[3].replace(/\r\n/g, '').replace(/\s+/g, ''); //Extracting connections.
			var connectionTokens = gateConnections.split(',');
			var gateInputs = [];
			var gateOuputs = [];
			var EDIFModel = EDIF[instanceModel];

			if(typeof EDIFModel === 'undefined'){ //Checking the existence of the model in the library.
				console.log('Unknown module ' + instanceModel);
				return callback('Unknown module ' + instanceMode, null, null, null);
			}

			if (EDIFModel.hasOwnProperty('compound') && EDIFModel.compound){
				EDIFModel.getComponent(function(subGates, subWires){

							for(var z = 0; z < subGates.length; z++){
								if(subGates[z].inputs.length > 0){
									for(var zz = 0; zz < subGates[z].inputs.length; zz++){
										var subWKey;
										for(var key in subWires){
											if(subWires[key].id ==  subGates[z].inputs[zz]){
												subWKey = key;
												break;
											}
										}
										if (typeof(subWKey) === 'undefined'){
											console.log('Unknown ' + subGates[z].inputs[zz]);
											break;
										}
										if(subWires[subWKey].isFlyingWire()){
											console.log('Flying subwire: ' + subWKey);
											subGates[z].removeInput(subWires[subWKey].id);
											delete subWires[subWKey];
											subWKey = undefined;
											z--;
										}
									}
								}
							}
							for (key in subWires){
								wires[key] = subWires[key];
							}

							for (var p = 0; p < connectionTokens.length; p++) { //Establishing connections.
								var paramRegex = getParamRegEx();
								var matchedTokens = paramRegex.exec(connectionTokens[p]);
								var portName = matchedTokens[1];
								var wireName = matchedTokens[2];
								if(EDIFModel.inputPorts.indexOf(portName) != -1){ //Establishing input connection.
									if (typeof wires[wireName] !== 'undefined'){
										for(var z = 0; z < subGates.length; z++){
											var wirePlaced = false;
											if (subGates[z].openInputTerminals > 0){
												subGates[z].addInput(wires[wireName].id);
												wires[wireName].addOutput(subGates[z].id);
												wirePlaced = true;
												break;
											}
										}
										if (!wirePlaced){
											console.log('Could not connect the wire ' + wireName);
										}
										
									}else if (typeof inputs[wireName] !== 'undefined'){
										for(var z = 0; z < subGates.length; z++){
											var wirePlaced = false;
											if (subGates[z].openInputTerminals > 0){
												console.log('Connecting input wire: ' + wireName + ' to ' + subGates[z].model + '  ' + subGates[z].id);

												subGates[z].addInput(inputs[wireName].id);
												inputs[wireName].addOutput(subGates[z].id);
												wirePlaced = true;
												break;
											}
										}
										if (!wirePlaced){
											console.log('Could not connect the wire ' + wireName);
										}

									}else{
										console.log('Undeclared wire ' + wireName); 
										return callback('Undeclared wire ' + wireName, null, null, null);
									}
								}else if (EDIFModel.outputPorts.indexOf(portName) != -1){ //Establishing output connection.
									if (typeof wires[wireName] !== 'undefined'){
										for(var z = 0; z < subGates.length; z++){
											var wirePlaced = false;
											if (subGates[z].openOutputTerminals > 0){
												subGates[z].addOutput(wires[wireName].id);
												wires[wireName].setInput(subGates[z].id);
												wirePlaced = true;
												break;
											}
										}
										if (!wirePlaced){
											console.log('Could not connect the wire ' + wireName);
										}

									}else if (typeof outputs[wireName] !== 'undefined'){
										for(var z = 0; z < subGates.length; z++){
											var wirePlaced = false;
											if (subGates[z].openOutputTerminals > 0){
												subGates[z].addOutput(outputs[wireName].id);
												outputs[wireName].setInput(subGates[z].id);
												wirePlaced = true;
												break;
											}
										}
										if (!wirePlaced){
											console.log('Could not connect the wire ' + wireName);
										}
									}else{
										console.log('Undeclared wire ' + wireName);
										return callback('Undeclared wire ' + wireName, null, null, null);
									}
								}else{
									console.log('Undefined port ' + portName + ' for ' + EDIFModel.name);
									return callback('Undefined port ' + portName + ' for ' + EDIFModel.name, null, null, null);
								}
								
							}
							for (var f = 0; f < subGates.length; f++)
								gates.push(subGates[f]);
						
					});
				
					
			}else{
				var newGate = new Component[EDIFModel.primitive](instanceModel);
				for (var p = 0; p < connectionTokens.length; p++) { //Establishing connections.
					var paramRegex = getParamRegEx();
					var matchedTokens = paramRegex.exec(connectionTokens[p]);
					var portName = matchedTokens[1];
					var wireName = matchedTokens[2];
					if(EDIFModel.inputPorts.indexOf(portName) != -1){ //Establishing input connection.
						if (typeof wires[wireName] !== 'undefined'){
							newGate.addInput(wires[wireName].id);
							wires[wireName].addOutput(newGate.id);
						}else if (typeof inputs[wireName] !== 'undefined'){
							newGate.addInput(inputs[wireName].id);
							inputs[wireName].addOutput(newGate.id);
						}else if (typeof outputs[wireName] !== 'undefined'){
							newGate.addInput(outputs[wireName].id);
							outputs[wireName].addOutput(newGate.id);
						}else{
							console.log('Undeclared wire ' + wireName); 
							return callback('Undeclared wire ' + wireName, null, null, null);
						}
					}else if (EDIFModel.outputPorts.indexOf(portName) != -1){ //Establishing output connection.
						if (typeof wires[wireName] !== 'undefined'){
							newGate.addOutput(wires[wireName].id);
							wires[wireName].setInput(newGate.id);
						}else if (typeof outputs[wireName] !== 'undefined'){
							newGate.addOutput(outputs[wireName].id);
							outputs[wireName].setInput(newGate.id);
						}else if(typeof inputs[wireName] !== 'undefined'){
							newGate.addOutput(inputs[wireName].id);
							inputs[wireName].setInput(newGate.id);
						}else{
							console.log('Undeclared wire ' + wireName);
							return callback('Undeclared wire ' + wireName, null, null, null);
						}
					}else{
						console.log('Undefined port ' + portName + ' for ' + EDIFModel.name);
						return callback('Undefined port ' + portName + ' for ' + EDIFModel.name, null, null, null);
					}
					
				}
				gates.push(newGate);
			}

		}else{
			console.log('Invalid line ' + lines[i]);
			warnings.push('Invalid line ' + lines[i] + ', ignored while parsing');
		}
	}
	


	var allWires = new Array();
	for(key in wires){
		//console.log(key + ' : ' + wires[key].id);
		if (wires[key].isFlyingWire()){
			console.log('Warning, flying wire ' + key);
			warnings.push('Warning detected flying wire ' + key + ' , trimmed before graphing');
			for (var j = 0; j < gates.length; j++){
				var inputIndex = gates[j].inputs.indexOf(wires[key].id);
				var outputIndex = gates[j].outputs.indexOf(wires[key].id);
				if (inputIndex != -1){
					gates[j].inputs.splice(inputIndex, 1);
				}
				if(outputIndex != -1){
					gates[j].outputs.splice(outputIndex, 1);
				}
			}
		}else
			allWires.push(wires[key]);
	}
	for(key in inputs){
		//console.log(key + ' : ' + inputs[key].id);
		if (inputs[key].isFlyingWire()){
			console.log('Warning, flying wire ' + key);
			warnings.push('Warning detected flying wire ' + key + ' , trimmed before graphing');
			for (var j = 0; j < gates.length; j++){
				var inputIndex = gates[j].inputs.indexOf(inputs[key].id);
				var outputIndex = gates[j].outputs.indexOf(inputs[key].id);
				if (inputIndex != -1){
					gates[j].inputs.splice(inputIndex, 1);
				}
				if(outputIndex != -1){
					gates[j].outputs.splice(outputIndex, 1);
				}
			}
		}else
			allWires.push(inputs[key]);
	}
	for(key in outputs){
		//console.log(key + ' : ' + outputs[key].id);
		if (outputs[key].isFlyingWire()){
			console.log('Warning, flying wire ' + key);
			warnings.push('Warning detected flying wire ' + key + ' , trimmed before graphing');
			for (var j = 0; j < gates.length; j++){
				var inputIndex = gates[j].inputs.indexOf(outputs[key].id);
				var outputIndex = gates[j].outputs.indexOf(outputs[key].id);
				if (inputIndex != -1){
					gates[j].inputs.splice(inputIndex, 1);
				}
				if(outputIndex != -1){
					gates[j].outputs.splice(outputIndex, 1);
				}
			}
		}else
			allWires.push(outputs[key]);
	}

		
	return callback(null, gates, allWires, warnings);
}