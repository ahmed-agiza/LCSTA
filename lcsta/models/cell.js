/*	Cell Model  */

var shortId = require('shortid');


module.exports = function(instanceName, libDef){
	this.id = shortId.generate(); //Component ID.
	this.inputs = {}; //Inputs object.
	this.outputs = {}; //Outputs object.
	this.ff = false; //Checking for sequential elements.
	this.instanceName = instanceName;

	this.setDefinition = function(def){ //Setting liberty file cell definition.
		if(typeof(def) !== 'undefined'){
			this.cellName = def.name;
			this.inputPorts = def.inputs;
			this.outputPort = def.output;
			this.timing = def.timing;
			this.ff = def.ff;
		}
	}

	this.setDefinition(libDef);

	this.getOutputs = function(){ //Getting output cells array.
		if(typeof(this.outputPort) !== 'undefined')
			return this.outputs[this.outputPort];
	}
	this.getInputs = function(){ //Getting input cells array.
		if(typeof(this.inputPorts) !== 'undefined'){
			var retInputs = [];
			for(var i = 0; i < this.inputPorts.length; i++)
				retInputs.concat(this.inputs[this.inputPorts[i]]);
			return retInputs;
		}
				
	}
	this.isFF = function(){ //Checking for sequential elements.
		return this.ff;
	}

}

