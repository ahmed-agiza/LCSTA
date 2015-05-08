/*	Cell Model  */

var shortId = require('shortid');

var DIRECTION = {
	input: 0,
	output: 1
};

module.exports.directions = DIRECTION;

var TIMING_SENSE = {
	negative_unate: 0,
	positive_unate: 1,
	non_unate: 2,
};

module.exports.timing_sense = TIMING_SENSE;

var TIMING_TYPE = {
	hold_falling: 0,
	setup_falling: 1,
	falling_edge: 2,
	rising_edge: 3,
	hold_rising: 4,
	setup_rising: 5,
	clear: 6,
	preset: 7,
	recovery_rising: 8,
	removal_rising: 9,
	three_state_enable: 10,
	three_state_disable: 11
};

module.exports.timing_type = TIMING_TYPE;

var port = function(name, direction, capacitance, rise_capacitance, fall_capacitance, max_capacitance){
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
}

module.exports.port = port;

module.exports.cell = function(instanceName, libDef){
	this.id = shortId.generate(); //Component ID.
	this.inputs = {}; //Inputs objects.
	this.outputs = {}; //Outputs objects.
	this.ff = false; //Checking for sequential elements.
	this.latch = false;
	this.instanceName = instanceName;

	// For STA
	this.delays = {}; // An array of delays
	this.input_slew = -1; // For the timing table
	this.capacitance_load = -1; // For the timing table
	this.AAT; // Actual Arrival Time
	this.RAT; // Required Arrival Time
	this.slack; // Gate slack


	this.setDefinition = function(def){ //Setting liberty file cell definition.
		if(typeof(def) !== 'undefined'){
			this.area = def.area;
			this.cell_leakage_power = def.cell_leakage_power;
			this.cellName = def.name;
			this.inputPorts = def.inputs;
			this.outputPort = def.outputs;
			this.inputs = {};
			this.outputs ={};
			for(var key in this.inputPorts){
				this.inputs[this.inputPorts[key].name] = [];
				// For STA
				this.delays[this.inputPorts[key].name] = {
					cell_rise: -1,
					cell_fall: -1,
					rise_transition: -1,
					fall_transition: -1
				};
			}
			var op = Object.keys(this.outputPort)[0];
			this.outputs[op]= [];
			this.ff = def.ff;
			this.latch = def.latch;
		}
	}

	this.setDefinition(libDef);

	this.getOutputs = function(){ //Getting output cells array.
		if(typeof(this.outputPort) !== 'undefined'){
			var op = Object.keys(this.outputPort)[0];
			return this.outputs[op];
		}
	}
	this.getInputs = function(){ //Getting input cells array.
		if(typeof(this.inputPorts) !== 'undefined'){
			var retInputs = [];
			for(var key in this.inputPorts)
				retInputs = retInputs.concat(this.inputs[this.inputPorts[key].name]);
			return retInputs;
		}
				
	}


	this.isFF = function(){ //Checking for sequential elements.
		return this.ff;
	}
	this.isLatch = function(){ //Checking for sequential elements.
		return this.latch;
	}

};

module.exports.connect = function(source, target, portName){
	if(typeof(target.inputPorts[portName]) !== 'undefined'){
		if(target.inputs[portName].indexOf(source) == -1){
			var op = Object.keys(source.outputPort)[0];
			source.outputs[source.outputPort[op].name].push(target);
			target.inputs[portName].push(source);
		}else{
			console.log('Connection already exists.');
		}
	}else
		console.log('Port ' + portName + ' is not defined as input port for this cell.');

};


module.exports.templateCell = {
	name: 'TemplateCell',
	inputs: {
					'a':{
							name: 'a',
							direction: DIRECTION.input,
							capacitance: 0.109759,
							rise_capacitance: 0.109546,
							fall_capacitance: 0.109759,
							max_capacitance: 0
					}, 
					'b':{
							name: 'b',
							direction: DIRECTION.input,
							capacitance: 0.109759,
							rise_capacitance: 0.109546,
							fall_capacitance: 0.109759,
							max_capacitance: 0
					}
			},
	outputs: {
				'y':{
							name: 'y',
							direction: DIRECTION.output,
							capacitance: 0,
							rise_capacitance: 0,
							fall_capacitance: 0,
							max_capacitance: 0,
							timing:{
									a: {
											timing_sense: TIMING_SENSE.negative_unate,
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
	ff: false,
	latch: false
};

