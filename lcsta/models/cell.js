"use strict";

/*	Cell Model  */

var shortId = require('shortid');


var port = function(name, direction, capacitance, rise_capacitance, fall_capacitance, max_capacitance, net_capacitance){
	this.name = name;

	if(typeof(direction) === 'undefined')
		this.direction = 0;
	else
		this.direction = direction;

	if(typeof(capacitance) === 'undefined')
		this.capacitance = 0;
	else
		this.capacitance = capacitance;

	if(typeof(rise_capacitance) === 'undefined')
		this.rise_capacitance = 0;
	else
		this.rise_capacitance = rise_capacitance;

	if(typeof(fall_capacitance) === 'undefined')
		this.fall_capacitance = 0;
	else
		this.fall_capacitance = fall_capacitance;

	if(typeof(max_capacitance) === 'undefined')
		this.max_capacitance = 0;
	else
		this.max_capacitance = max_capacitance;

	if(typeof(net_capacitance) === 'undefined')
		this.net_capacitance = 0;
	else
		this.net_capacitance = net_capacitance;
}

module.exports.port = port;

module.exports.cell = function(instanceName, libDef, libRef){
	this.id = shortId.generate(); //Component ID.
	this.inputs = {}; //Inputs objects.
	this.outputs = {}; //Outputs objects.
	this.is_ff = false; //Checking for sequential elements.
	this.is_latch = false;
	this.instanceName = instanceName;
	

	// -------------------------For STA--------------------------------
	this.AAT = 0; // Actual Arrival Time
	this.RAT = 0; // Required Arrival Time
	this.slack = 0; // Gate slack
	this.clock_skew; // Clock skew: Used for FF only
	this.isClock = false; // Is the node the clock pin

	this.input_slew = { // Maximum and minimum input slew rates
		max: -1,
		min: Number.MAX_VALUE
	};
	this.capacitance_load = { // Maximum and minimum capacitance loads
		max: 0,
		min: 0
	};
	this.output_slew = { // Maximum and minimum output slew rates
		max: -1,
		min: Number.MAX_VALUE
	};
	this.gate_delay = { // Maximum and minimum gate delays
		max: -1,
		min: Number.MAX_VALUE
	};
	// ----------------------------------------------------------------

	this.setDefinition = function(def, ref){ //Setting liberty file cell definition.
		this.libraryRef = ref; 
		if(typeof(def) !== 'undefined'){
			this.cellName = def.name;
			this.size = def.size;
			this.inputPorts = {};
			this.outputPort = {};
			this.unkownPorts = {};
			this.available_sizes = def.available_sizes;

			if(typeof ref !== 'undefined'){
				this._alter_definitions = {};
				for(var key in ref.sizing[def.basenameX]){
					this._alter_definitions[key] = ref.sizing[def.basenameX][key];
				}
			}

			for(var key in def.pins){
				if (def.pins[key].direction == 'input'){
					this.inputPorts[key] = def.pins[key];
				}else if (def.pins[key].direction == 'output'){
					this.outputPort[key] = def.pins[key];
				}else{
					this.unkownPorts[key] = def.pins[key];
				}
			}
			this.inputs = {};
			this.outputs ={};
			var op = Object.keys(this.outputPort)[0];
			this.outputs[op]= [];
			this.is_ff = def.is_ff;
			this.is_latch = def.is_latch;

			if(typeof def.is_input !== 'undefined')
				this.is_input = def.is_input;
			else
				this.is_input = false;

			if(typeof def.is_output !== 'undefined')
				this.is_output = def.is_output;
			else
				this.is_output = false;
			
			if(!def.is_dummy){
				this.area = def.area;
				this.cell_leakage_power = def.cell_leakage_power;
				this.is_dummy = false
			}else
				this.is_dummy = true;
			for(var key in this.inputPorts){
				this.inputs[this.inputPorts[key].name] = [];
			}
			

		}else
			console.log('No definition for ' + instanceName);
	};

	this.setDefinition(libDef, libRef);

	this.getOutputs = function(){ //Getting output cells array.
		if(typeof(this.outputPort) !== 'undefined'){
			var op = Object.keys(this.outputPort)[0];
			return this.outputs[op];
		}
	};

	this.getInputs = function(){ //Getting input cells array.
		if(typeof(this.inputPorts) !== 'undefined'){
			var retInputs = [];
			for(var key in this.inputPorts)
				retInputs = retInputs.concat(this.inputs[this.inputPorts[key].name]);
			return retInputs;
		}
				
	};


	this.isFF = function(){ //Checking for sequential elements.
		return this.is_ff;
	};

	this.isLatch = function(){ //Checking for sequential elements.
		return this.is_latch;
	};

	this.resizeTo = function(value){
		if(value <= 0)
			throw "Invalid size " + value;
		if(typeof this._alter_definitions[value] == 'undefined'){
			console.log('Size %d is not available', value);
			return 0;
		}else{
			console.log('Resizing %s to %d', this.instanceName, value);
			this.size = parseInt(value);
			var newCellDef = this._alter_definitions[value];
			this.cellName = newCellDef.name;
			for(var key in newCellDef.pins){
				if (newCellDef.pins[key].direction == 'input'){
					this.inputPorts[key] = newCellDef.pins[key];
				}else if (newCellDef.pins[key].direction == 'output'){
					this.outputPort[key] = newCellDef.pins[key];
				}else{
					this.unkownPorts[key] = newCellDef.pins[key];
				}
			}
			return value;
		}
	}

	this.getMinimumSize = function (){
		var min = 9999;
		for(var key in this._alter_definitions){
			var size = parseInt(key);
			if(size < min)
				min = size;
		}
		return min;
	}

	this.getMaximumSize = function(){
		var max = -1;
		for(var key in this._alter_definitions){
			var size = parseInt(key);
			if(size > max)
				max = size;
		}
		return max;
	}



	this.resizeBelow = function(value){
		if(value <= 0)
			throw "Invalid size " + value;
		var newSize = this.getMinimumSize();
		for(var key in this._alter_definitions){
			var size = parseInt(key);
			if(size > newSize && size < value)
				newSize = size;
		}
		return this.resizeTo(newSize);

	};

	this.resizeAbove = function(value){
		if(value <= 0)
			throw "Invalid size " + value;
		var newSize = this.getMaximumSize();
		for(var key in this._alter_definitions){
			var size = parseInt(key);
			if(size < newSize && size > value)
				newSize = size;
		}
		return this.resizeTo(newSize);

	};

	

	this.resizeBetweenMinimum = function(min, max){

		if(min <= 0)
			throw "Invalid size " + min;
		if(max <= 0)
			throw "Invalid size " + max;

		var newSize = 9999;

		for(var key in this._alter_definitions){
			var size = parseInt(key);
			if(size < max && size > min && size < newSize)
				newSize = size;
		}

		return this.resizeTo(newSize);
	};

	this.resizeBetweenMinimumInclusive = function(min, max){

		if(min <= 0)
			throw "Invalid size " + min;
		if(max <= 0)
			throw "Invalid size " + max;


		var newSize = 9999;

		for(var key in this._alter_definitions){
			var size = parseInt(key);
			if(size <= max && size >= min && size < newSize)
				newSize = size;
		}

		return this.resizeTo(newSize);
	};

	this.resizeBetweenMaximum = function(min, max){
		
		if(min <= 0)
			throw "Invalid size " + min;
		if(max <= 0)
			throw "Invalid size " + max;

		var newSize = -1;

		for(var key in this._alter_definitions){
			var size = parseInt(key);
			if(size < max && size > min && size > newSize)
				newSize = size;
		}

		return this.resizeTo(newSize);
	};

	this.resizeBetweenMaximumInclusive = function(min, max){

		if(min <= 0)
			throw "Invalid size " + min;
		if(max <= 0)
			throw "Invalid size " + max;

		var newSize = -1;

		for(var key in this._alter_definitions){
			var size = parseInt(key);
			if(size <= max && size >= min && size > newSize)
				newSize = size;
		}

		return this.resizeTo(newSize);
	};

	

};




module.exports.connect = function(source, target, portName, netCap){
	if(typeof(target.inputPorts[portName]) !== 'undefined'){
		if(target.inputs[portName].indexOf(source) == -1){
			var op = Object.keys(source.outputPort)[0];
			source.outputs[source.outputPort[op].name].push(target);
			if(typeof netCap !== 'undefined')
				source.outputPort[op].net_capacitance = netCap;

			target.inputs[portName].push(source);
		}else{
			console.log('Connection already exists.');
		}
	}else
		console.log('Port ' + portName + ' is not defined as input port for this cell.');

};


var clone = function(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

module.exports.clone = clone;


module.exports.templateCell = {
	name: 'TemplateCell',
	inputs: {
					'a':{
							name: 'a',
							direction: 'input',
							capacitance: 0.109759,
							rise_capacitance: 0.109546,
							fall_capacitance: 0.109759,
							max_capacitance: 0,
							net_capacitance: 0
					}, 
					'b':{
							name: 'b',
							direction: 'input',
							capacitance: 0.109759,
							rise_capacitance: 0.109546,
							fall_capacitance: 0.109759,
							max_capacitance: 0,
							net_capacitance: 0
					}
			},
	outputs: {
				'y':{
							name: 'y',
							direction: 'output',
							capacitance: 0,
							rise_capacitance: 0,
							fall_capacitance: 0,
							max_capacitance: 0,
							net_capacitance: 20,
							timing:{
									a: {
											timing_sense: 'negative_unate',
											cell_fall:{
												'0.015':{
													'0.06':0.094223,
													'0.18':0.122979,
													'0.42':0.16574,
													'0.6':0.193293,
													'1.2':0.267001
												},
												'0.04':{
													'0.06':0.138995,
													'0.18':0.168762,
													'0.42':0.224888,
													'0.6':0.258293,
													'1.2':0.348349
												},
												'0.08':{
													'0.06':0.207887,
													'0.18':0.238263,
													'0.42':0.304627,
													'0.6':0.345288,
													'1.2':0.454567
												},
												'0.2':{
													'0.06':0.413428,
													'0.18':0.441918,
													'0.42':0.506489,
													'0.6':0.558761,
													'1.2':0.714238
												},
												'0.4':{
													'0.06':0.754586,
													'0.18':0.782418,
													'0.42':0.843585,
													'0.6':0.892655,
													'1.2':1.06707
												}
											},
											fall_transition:{
												'0.015':{
													'0.06':0.094223,
													'0.18':0.122979,
													'0.42':0.16574,
													'0.6':0.193293,
													'1.2':0.267001
												},
												'0.04':{
													'0.06':0.138995,
													'0.18':0.168762,
													'0.42':0.224888,
													'0.6':0.258293,
													'1.2':0.348349
												},
												'0.08':{
													'0.06':0.207887,
													'0.18':0.238263,
													'0.42':0.304627,
													'0.6':0.345288,
													'1.2':0.454567
												},
												'0.2':{
													'0.06':0.413428,
													'0.18':0.441918,
													'0.42':0.506489,
													'0.6':0.558761,
													'1.2':0.714238
												},
												'0.4':{
													'0.06':0.754586,
													'0.18':0.782418,
													'0.42':0.843585,
													'0.6':0.892655,
													'1.2':1.06707
												}
											},
											cell_rise:{
												'0.015':{
													'0.06':0.094223,
													'0.18':0.122979,
													'0.42':0.16574,
													'0.6':0.193293,
													'1.2':0.267001
												},
												'0.04':{
													'0.06':0.138995,
													'0.18':0.168762,
													'0.42':0.224888,
													'0.6':0.258293,
													'1.2':0.348349
												},
												'0.08':{
													'0.06':0.207887,
													'0.18':0.238263,
													'0.42':0.304627,
													'0.6':0.345288,
													'1.2':0.454567
												},
												'0.2':{
													'0.06':0.413428,
													'0.18':0.441918,
													'0.42':0.506489,
													'0.6':0.558761,
													'1.2':0.714238
												},
												'0.4':{
													'0.06':0.754586,
													'0.18':0.782418,
													'0.42':0.843585,
													'0.6':0.892655,
													'1.2':1.06707
												}
											},
											rise_transition:{
												'0.015':{
													'0.06':0.094223,
													'0.18':0.122979,
													'0.42':0.16574,
													'0.6':0.193293,
													'1.2':0.267001
												},
												'0.04':{
													'0.06':0.138995,
													'0.18':0.168762,
													'0.42':0.224888,
													'0.6':0.258293,
													'1.2':0.348349
												},
												'0.08':{
													'0.06':0.207887,
													'0.18':0.238263,
													'0.42':0.304627,
													'0.6':0.345288,
													'1.2':0.454567
												},
												'0.2':{
													'0.06':0.413428,
													'0.18':0.441918,
													'0.42':0.506489,
													'0.6':0.558761,
													'1.2':0.714238
												},
												'0.4':{
													'0.06':0.754586,
													'0.18':0.782418,
													'0.42':0.843585,
													'0.6':0.892655,
													'1.2':1.06707
												}
											}
										}
								}
					}
			},
	area : 96,
  	cell_leakage_power : 0.0252328,
	is_ff: false,
	is_latch: false
};

