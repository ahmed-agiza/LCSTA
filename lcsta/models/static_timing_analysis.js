var Cell = require('./cell');

var STA = function(gates, constraints){ // Constructor
	this.gates = gates; // Gates
	this.gates.unshift("Origin"); // Dummy node
	this.constraints = constraints; // Constraints
	this.timing_graph = new Array(this.gates.length); // Structure to store the timing graph
	this.levels = new Array(); // Starting nodes

	// Constraints data
	this.input_delays = constraints.input_delays; // Constraint input delays (cell rise and cell fall)
	this.output_delays = constraints.output_delays; // Constraint output delays (cell rise and cell fall)
	this.input_slew = constraints.input_slew; // Constraint input slew rates (rise transition and fall transition)
	this.output_capacitance_load = constraints.output_capacitance_load; // Constraint output capacitance loads (maximum and minimum loads)
	this.clock = constraints.clock; // Constraint clock
	this.clock_node; // The cell modelling the clock

	fetchAndSetupClockNode(); // Locate clock node

	// Constructing the timing graph
	for(var i=1; i<this.gates.length; i++){
		if(this.gates[i].getInputs.length == 0 || this.gates[i].isFF){ // Starting point of a timing path: Input pin / FF
			this.starting_nodes.push(i); // Set of starting nodes (CHECK IF NEEDED)
			if(!this.gates[i].isClock){
				this.timing_graph[0].push({ // Origin points at the starting nodes of the timing path
					port: "Dummy",
					gate: i
				});
				buildTimingPath(this.gates[i], i);
			}
		}
	}
	// Timing path constructed

	this.arrivalTimeCalculation = function(){ // Calculating arrival time

	};

	this.requiredTimeCalculation = function(){

	};

	this.calculateSlack = function(){

	};

	this.generateTimingReport = function(){

	};

	this.optimizeCellSizes = function(){

	};

	this.fixTimingViolation = function(){

	};

	var fetchAndSetupClockNode = function(){
		var input_slew;
		for(var i=1; i<this.gates.length; i++){
			if(this.gates[i].isFF){
				for(var key in this.gates[i].inputPorts){
					if(this.gates[i].inputPorts[key].clock){
						this.clock_node = this.gates[i].inputs[key];
						this.clock_node.isClock = true;
						
						// Setup clock node 
						this.clock_node.gate_delay.max = 0;
						this.clock_node.gate_delay.min = 0;

						input_slew = this.input_slew[this.clock_node.instanceName];
						this.clock_node.input_slew.max = max(input_slew.rise_transition, input_slew.fall_transition);
						this.clock_node.input_slew.min = min(input_slew.rise_transition, input_slew.fall_transition);

						this.clock_node.output_slew.max = this.clock_node.input_slew.max;
						this.clock_node.output_slew.min = this.clock_node.input_slew.min;
						return;
					}
				}
			}
		}
	};

	var buildTimingPath = function(current, current_index){ // Building timing graph using DFS
		var children = current.getOutputs();
		var child_index;
		for(var i=0; i<children.length; i++){
			child_index = this.gates.indexOf(children[i]);
			this.timing_graph[current_index].push({
				port: getInputPort(current, children[i]),
				gate: child_index
			});
		}
		if(!children[i].getOutputs.length == 0 || children[i].isFF){ // Not an end of a timing path
			buildTimingPath(children[i], child_index);
		}
	};

	var getInputPort = function(parent, child){ // Get the child's input port the parent connects to
		for(var key in child.inputPorts)
			if(child.inputs[key] == parent)
				return child.inputPorts[key];
	};

	var forwardTraversal = function(){ // Evaluate input slew rates, capacitance loads, output slew rates, gate delays, and AAT using BFS
		var calculated_capacitance = new Array(this.gates.length); // Capacitance previously evaluated
		var queue = new Array(); // BFS queue
		int current;
		var child_index;
		var child;
		for(var i=0; i<calculated_capacitance.length; i++){ // Initialize to false
			calculated_capacitance[i] = false;
		}

		this.level[0] = 0;
		queue.push(0); // Push origin
		while(queue.length > 0){
			current = queue.shift();
			for(var i=0; i<this.timing_graph[current].length; i++){
				child_index = this.timing_graph[current][i].gate;
				child = this.gates[child_index];
				queue.push(child_index);
				if(current == 0){ // Origin
					if(child.getInputs.length == 0) // Input pin
						initializeInputPort(child);
					else if(node.isFF) // FF
						initializeFF(child, child_index);
				}
				else {

				}
			}
		}
	};

	var initializeInputPort = function(start_node){ // Setup input pin
		// AAT
		var input_delay;
		var input_slew;
		if(start_node.instanceName in this.input_delays){
			input_delay = this.input_delays[start_node.instanceName];
			start_node.gate_delay.max = max(input_delay.cell_rise, input_delay.cell_fall);
			start_node.gate_delay.min = min(input_delay.cell_rise, input_delay.cell_fall);
		}
		else{
			start_node.gate_delay.max = 0;
			start_node.gate_delay.min = 0;
		}
		start_node.AAT = start_node.gate_delay.max // Input delay added

		// Input slew
		if(start_node.instanceName in this.input_slew){
			input_slew = this.input_slew[start_node.instanceName];
			start_node.input_slew.max = max(input_slew.rise_transition, input_slew.fall_transition);
			start_node.input_slew.min = min(input_slew.rise_transition, input_slew.fall_transition);
		}
		else{
			start_node.input_slew.max = 0;
			start_node.input_slew.min = 0;
		}
		// Set the output slew
		start_node.output_slew.max = start_node.input_slew.max;
		start_node.output_slew.min = start_node.input_slew.min;
	};

	var initializeFF = function(start_node, node_index){ // Setup FF as a starting node
		evaluateCapacitanceLoad(start_node, node_index);

		// AAT
		start_node.AAT = start_node.clock_skew; // Add clock skew to AAT

		// Set input slew rates
		start_node.input_slew.max = this.clock_node.output_slew.max;
		start_node.input_slew.min = this.clock_node.output_slew.min;

		var clock_port;
		for(var key in start_node.inputPorts){ // Get the clock port
			if(start_node.inputPorts[key].clock){
				clock_port = start_node.inputPorts[key];
				break;
			}
		}
		updateValues(this.clock, start_node, clock_port); // Setup the FF values
	};

	var evaluateCapacitanceLoad = function(node, node_index){ // Calculate the capacitance load for a cell
		var child;
		var child_index;
		for(var key in node.outputPorts){ // One output port for simple gates
			for(var i=0; i<this.timing_graph[node_index].length; i++){
				child_index = this.timing_graph[node_index][i].gate;
				child = this.gates[child_index];

				// Add the net capacitance to both the minimum and the maximum
				node.capacitance_load.max += node.outputPorts[key].net_capacitance[child.instanceName][child.port];
				node.capacitance_load.min += node.outputPorts[key].net_capacitance[child.instanceName][child.port];

				// Add the maximum and minimum capacitance as a result of the child port
				node.capacitance_load.max += max(child.port.rise_capacitance, child.port.fall_capacitance);
				node.capacitance_load.min += min(child.port.rise_capacitance, child.port.fall_capacitance);
			}
		}
		// Got the total capacitance loading the gate
	};

	var updateValues = function(parent, child, input_port){ // Check and update the input and output slew rates, gate delays, and AAT

	};
};