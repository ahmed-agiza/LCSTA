var Cell = require('./cell');

var STA = function(gates, constraints){ // Constructor
	this.gates = gates; // Gates
	this.constraints = constraints; // Constraints
	this.timing_graph = new Array(); // Structure to store the timing graph
	this.starting_nodes = new Array(); // Starting nodes

	// Constraints Data
	// These will map the input pins to their delays
	this.input_delays = constraints.input_delays; // Constraint input delays
	this.output_delays = constraints.output_delays; // Constraint output delays
	this.input_slew = constraints.input_slew; // Constraint input slew rates
	this.output_capacitance_load = constraints.output_capacitance_load; // Constraint output capacitance loads
	this.clock = constraints.clock; // Constraint clock

	// Constructing the timing graph
	for(var i=0; i<this.gates.length; i++){
		if(this.gates[i].getInputs.length == 0 || this.gates[i].isFF){ // Starting point of a timing path: Input pin / FF
			this.starting_nodes.push(i); // Set of starting nodes
			BuildTimingPath(this.timing_graph, this.gates[i], i);
		}
	}
	// Timing path constructed

	this.ArrivalTimeCalculation = function(){ // Calculating Arrival Time
		for(var i=0; i<this.starting_nodes.length; i++){
			var start_node = this.gates[this.starting_node[i]]; // Alias
			if(start_node.getInputs.length == 0){ // Input pin
				
				// AAT
				if(start_node.instanceName in this.input_delays)
					start_node.AAT = this.input_delays[start_node.instanceName]; // Input delay added
				else
					start_node.AAT = 0; // Input delay not provided

				// Input slew
				if(start_node.instanceName in this.input_slew){
					for(var key in start_node.inputPorts){ // There is exactly one port
						start_node.inputPorts[key].delays.rise_transition = this.input_slew[start_node.instanceName].rise_transition; // Input slew added
						start_node.inputPorts[key].delays.fall_transition = this.input_slew[start_node.instanceName].fall_transition; // Input slew added
					}
				}

			}
			else if(start_node.isFF){ // FF

				// AAT
				start_node.AAT = start_node.clock_skew; // Clock skew added
				for(var key in start_node.inputPorts){
					if(start_node.inputPorts[key].clock){ // If this is the clock port get the input slew rate for it
						start_node.inputPorts[key].input_slew.rise_transition = this.input_slew[start_node.instanceName].rise_transition;
						start_node.inputPorts[key].input_slew.fall_transition = this.input_slew[start_node.instanceName].fall_transition;
					}
				}

				// Capacitance load
				start_node.capacitance_load = 0; // Initialize
				for(var key in start_node.outputPorts){ // One output port for simple gates
					for(var j=0; j<this.timing_graph[this.starting_nodes[i]]; j++){
						var child = this.timing_graph[this.starting_nodes[i]][j];
						var FF = this.gates[this.starting_nodes[i]];

						// First operation: Get the net capacitance per port
						// Second operation: Get the capacitance loaded on the gate due to the port of the next gate
						FF.capacitance_load += FF.outputPorts[key].net_capacitance[this.gates[child.gate].instanceName][child.port];
						FF.capcaitance_load += FF.outputPorts[key].capacitance;
						// Got the total capacitance load on the FF
					}
				}

			}
		}

	};

	this.RequiredTimeCalculation = function(){

	};

	this.CalculateSlack = function(){

	};

	this.GenerateTimingReport = function(){

	};

	this.OptimizeCellSizes = function(){

	};

	this.FixTimingViolation = function(){

	};

	var BuildTimingPath = function(current, current_index){
		var children = current.getOutputs();
		var child_index;
		for(var i=0; i<children.length; i++){ // Loop over the children
			child_index = this.gates.indexOf(children[i]);
			this.timing_graph.push({
				port: GetInputPort(current, children[i]),
				gate: child_index
			});
			if(!(children[i].getOutputs.length == 0 || children[i].isFF)){ // Not an end of a timing path
				BuildTimingPath(children[i], child_index);
			}
		}
	};

	var GetInputPort = function(parent, child){
		for(var key in child.inputPorts)
			if(child.inputs[child.inputPorts[key].name] == parent)
				return child.inputPorts[key].name;
	};
};

module.exports = STA;