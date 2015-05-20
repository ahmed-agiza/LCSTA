'use strict';

var Cell = require('./cell');

var STA = function(gates, constraints){ // Constructor
	this.gates = gates; // Gates
	this.gates.unshift("Origin");
	this.constraints = constraints; // Constraints
	this.timing_graph = new Array(); // Structure to store the timing graph
	this.levels = new Array(); // Levels of the nodes in the timing graph
	this.starting_nodes = new Array(); // Starting nodes

	// Constraints Data
	// These will map the input pins to their delays
	this.input_delays = constraints.input_delays; // Constraint input delays
	this.output_delays = constraints.output_delays; // Constraint output delays
	this.input_slew = constraints.input_slew; // Constraint input slew rates
	this.output_capacitance_load = constraints.output_capacitance_load; // Constraint output capacitance loads
	this.clock = constraints.clock; // Constraint clock

	// Constructing the timing graph
	for(var i=1; i<this.gates.length; i++){
		if(this.gates[i].getInputs.length == 0 || this.gates[i].isFF){ // Starting point of a timing path: Input pin / FF
			this.starting_nodes.push(i); // Set of starting nodes
			this.timing_graph[0].push({ // Origin points at the starting nodes of the timing path
				port: "Dummy",
				gate: i
			});
			BuildTimingPath(this.timing_graph, this.gates[i], i);
		}
	}
	// Timing path constructed

	this.ArrivalTimeCalculation = function(){ // Calculating Arrival Time
		Initialize(); // Preparation of the starting nodes complete
		AssignAAT(); // Assigning the AAT for the timing graph


		for(var i=0; i<this.start_node.length; i++){

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
				return child.inputPorts[key];
	};

	var AssignAAT = function(){
		var calculated_capacitance = new Array(this.gates.length);
		var queue = new Array();
		int current;
		for(var i=0; i<calculated_capacitance.length; i++){
			calculated_capacitance[i] = false;
		}
		this.level[0] = 0;
		queue.push(0); // Push Origin
		while(queue.length > 0){
			current = queue.shift();
			for(var i=0; i<this.timing_graph[current].length; i++){
				queue.push(this.timing_graph[current][i].gate);
				var node = this.gates[this.timing_graph[current][i].gate];
				if(current == 0){
					if(node.getInputs.length == 0) // Input pin
						InitializeInputPort(node);
					else if(node.isFF) // FF
						InitializeFF(node, this.timing_graph[current][i].gate);
				}
				else{
					// Compute the capacitance load of the child node
					if(!calculated_capacitance[this.timing_graph[current][i].gate]){ // If not previously computed
						CalculateCapacitance(node, this.timing_graph[current][i].gate); // Get capacitance loading the cell
						calculated_capacitance[this.timing_graph[current][i].gate] = true; // Processed
					}

					ComputeDelay(node, this.timing_graph[current][i].port);
					UpdateAAT(this.gates[current], node, this.timing_graph[current][i].port);
					// Compute the AAT of this gate by comparing it with the current AAT
				}
			}
		}
	};

	var InitializeInputPort = function(start_node){
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
	};

	var InitializeFF = function(start_node, node_index){
		CalculateCapacitance(start_node, node_index); // Calculate total capacitance on gate

		// AAT
		var clock_port;
		start_node.AAT = start_node.clock_skew; // Clock skew added to AAT
		for(var key in start_node.inputPorts){
			if(start_node.inputPorts[key].clock){ // If this is the clock port get the input slew rate for it
				clock_port = start_node.inputPorts[key];
				start_node.inputPorts[key].input_slew.rise_transition = this.input_slew[start_node.instanceName].rise_transition;
				start_node.inputPorts[key].input_slew.fall_transition = this.input_slew[start_node.instanceName].fall_transition;
			}
		}
		ComputeDelay(start_node, clock_port); // Get the delay values for the node
		for(var key in start_node.inputPorts){ // Tcq added to AAT
			if(start_node.inputPorts[key].clock){
				start_node.AAT += max(start_node.inputPorts[key].delays.max.cell_rise, start_node.inputPorts[key].delays.max.cell_fall);
			}
		}
		// Computed output slew rates and node AAT
	};

	var CalculateCapacitance = function(node, node_index){
		// Capacitance load
		node.capacitance_load = 0; // Initialize
		for(var key in node.outputPorts){ // One output port for simple gates
			for(var i=0; i<this.timing_graph[node_index]; i++){
				var child = this.timing_graph[node_index][i];

				// First operation: Get the net capacitance per port
				// Second operation: Get the capacitance loaded on the gate due to the port of the next gate
				node.capacitance_load += node.outputPorts[key].net_capacitance[this.gates[child.gate].instanceName][child.port];
				node.capcaitance_load += node.outputPorts[key].capacitance;
				// Got the total capacitance load on the FF
			}
		}
	};

	var ComputeDelay = function(node, input_port){ // Compute the maximum and minimum gate delay and output slew rate for a given input port
		for(var output in node.outputPorts){ // Most cases we have one output port
			var output_port = node.outputPorts[output];
			// Maximum and minimum input slew rates
			var max_input_slew = max(input_port.input_slew.rise_transition, input_port.input_slew.fall_transition);
			var min_input_slew = min(input_port.input_slew.rise_transition, input_port.input_slew.fall_transition);

			// Max delays
			input_port.delays.max.cell_rise = output_port[input_port.name].timing.cell_rise.getData(max_input_slew, node.capacitance_load);
			input_port.delays.max.cell_fall = output_port[input_port.name].timing.cell_fall.getData(max_input_slew, node.capacitance_load);
			input_port.delays.max.rise_transition = output_port[input_port.name].timing.rise_transition.getData(max_input_slew, node.capacitance_load);
			input_port.delays.max.fall_transition = output_port[input_port.name].timing.fall_transition.getData(max_input_slew, node.capacitance_load);

			// Min delays
			input_port.delays.min.cell_rise = output_port[input_port.name].timing.cell_rise.getData(min_input_slew, node.capacitance_load);
			input_port.delays.min.cell_fall = output_port[input_port.name].timing.cell_fall.getData(min_input_slew, node.capacitance_load);
			input_port.delays.min.rise_transition = output_port[input_port.name].timing.rise_transition.getData(min_input_slew, node.capacitance_load);
			input_port.delays.min.fall_transition = output_port[input_port.name].timing.fall_transition.getData(min_input_slew, node.capacitance_load);
		}
	};

	var UpdateAAT = function(parent, child, input_port){
		child.AAT = max(child.AAT, parent.AAT + max(input_port.delays.max.cell_rise, input_port.delays.max.cell_fall));
	};
};

module.exports = STA;