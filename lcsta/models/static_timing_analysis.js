"use strict";

var Cell = require('./cell');

var STA = function(gates, constraints){ // Constructor
	this.arrivalTimeCalculation = function(){ // Calculating arrival time
		this._topologicalSorting(); // Sorting the graph for analysis

		var calculated_capacitance = new Array(this.gates.length); 
		var current;
		var current_index;
		var child_index;
		var child;
		var input_port;
		for(var i=0; i<calculated_capacitance.length; i++){
			calculated_capacitance[i] = false;
		}

		for(var i=0; i<this.forward_ordering.length; i++){
			current_index = this.forward_ordering[i];
			current = this.gates[current_index];
			for(var j=0; j<this.timing_graph[current_index].children.length; j++){
				child_index = this.timing_graph[current_index].children[j].gate;
				child = this.gates[child_index];
				input_port = this.timing_graph[current_index].children[j].port;
				if(current_index == 0){ // Origin
					if(child.getInputs().length == 0) // Input pin
						this._initializeInputPort(child);
					else if(child.isFF()) // FF
						this._initializeFF(child, child_index);
				}
				else{
					// Calculate the capacitance load of the child
					if(!calculated_capacitance[child_index]){ // If not previously computed
						this._evaluateCapacitanceLoad(child, child_index);
						calculated_capacitance[child_index] = true;
					}

					this._updateValues(parent, child, input_port); // Update the values for the child node
				}
			}
		}
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

	this._fetchAndSetupClockNode = function(){
		var input_slew;
		for(var i=1; i<this.gates.length; i++){
			if(this.gates[i].isFF()){
				for(var key in this.gates[i].inputPorts){
					if(this.gates[i].inputPorts[key].clock){
						this.clock_node = this.gates[i].inputs[key][0];
						this.clock_node.isClock = true;
						
						// Setup clock node 
						this.clock_node.gate_delay.max = 0;
						this.clock_node.gate_delay.min = 0;

						input_slew = this.input_slew[this.clock_node.instanceName];
						this.clock_node.input_slew.max = Math.max(input_slew.rise_transition, input_slew.fall_transition);
						this.clock_node.input_slew.min = Math.min(input_slew.rise_transition, input_slew.fall_transition);

						this.clock_node.output_slew.max = this.clock_node.input_slew.max;
						this.clock_node.output_slew.min = this.clock_node.input_slew.min;
						return;
					}
				}
			}
		}
	};

	this._buildTimingPath = function(current, current_index){ // Building timing graph using DFS
		var children = current.getOutputs();
		var child_index;
		for(var i=0; i<children.length; i++){
			child_index = this.gates.indexOf(children[i]);

			this.timing_graph[current_index].children.push({ // Point to child
				port: this._getInputPort(current, children[i]),
				gate: child_index
			});
			this.timing_graph[child_index].parents.push(current_index); // Point to parent

			if(!children[i].getOutputs().length == 0 || children[i].isFF()){ // Not an end of a timing path
				this._buildTimingPath(children[i], child_index);
			}
		}
	};

	this._getInputPort = function(parent, child){ // Get the child's input port the parent connects to
		for(var key in child.inputPorts)
			if(child.inputs[key][0] == parent)
				return child.inputPorts[key];
	};

	this._topologicalSorting = function(){ // Topologically sort the nodes for analysis
		var temp_timing_graph = this._clone(this.timing_graph); // Clone the graph as it will be modified during the process
		var starting = new Array();
		var current;
		var child_index;
		var element_index;
		starting.push(0); // Push the Origin node
		while(starting.length > 0){
			current = starting[0];
			starting.splice(0,1); // remove the first element
			this.forward_ordering.push(current);
			for(var i=0; i<temp_timing_graph[current].children.length; i++){ // Go over children
				child_index = temp_timing_graph[current].children[i].gate;
				element_index = temp_timing_graph[child_index].parents.indexOf(current); // Find the edge from child to parent
				temp_timing_graph[child_index].parents.splice(element_index, 1); // Remove the edge

				if(temp_timing_graph[child_index].parents.length == 0) // No more incoming edges
					starting.push(child_index);
			}
		}
	};

	this._initializeInputPort = function(start_node){ // Setup input pin
		// AAT
		var input_delay;
		var input_slew;
		if(start_node.instanceName in this.input_delays){
			input_delay = this.input_delays[start_node.instanceName];
			start_node.gate_delay.max = Math.max(input_delay.cell_rise, input_delay.cell_fall);
			start_node.gate_delay.min = Math.min(input_delay.cell_rise, input_delay.cell_fall);
		}
		else{
			start_node.gate_delay.max = 0;
			start_node.gate_delay.min = 0;
		}
		start_node.AAT = start_node.gate_delay.max // Input delay added

		// Input slew
		if(start_node.instanceName in this.input_slew){
			input_slew = this.input_slew[start_node.instanceName];
			start_node.input_slew.max = Math.max(input_slew.rise_transition, input_slew.fall_transition);
			start_node.input_slew.min = Math.min(input_slew.rise_transition, input_slew.fall_transition);
		}
		else{
			start_node.input_slew.max = 0;
			start_node.input_slew.min = 0;
		}
		// Set the output slew
		start_node.output_slew.max = start_node.input_slew.max;
		start_node.output_slew.min = start_node.input_slew.min;
	};

	this._initializeFF = function(start_node, node_index){ // Setup FF as a starting node
		this._evaluateCapacitanceLoad(start_node, node_index);

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
		this._updateValues(this.clock, start_node, clock_port); // Setup the FF values
	};

	this._evaluateCapacitanceLoad = function(node, node_index){ // Calculate the capacitance load for a cell
		var child;
		var child_index;
		for(var key in node.outputPorts){ // One output port for simple gates
			for(var i=0; i<this.timing_graph[node_index].children.length; i++){
				child_index = this.timing_graph[node_index].children[i].gate;
				child = this.gates[child_index];

				// Add the net capacitance to both the minimum and the maximum
				node.capacitance_load.max += node.outputPorts[key].net_capacitance[child.instanceName][child.port];
				node.capacitance_load.min += node.outputPorts[key].net_capacitance[child.instanceName][child.port];

				// Add the maximum and minimum capacitance as a result of the child port
				node.capacitance_load.max += Math.max(child.port.rise_capacitance, child.port.fall_capacitance);
				node.capacitance_load.min += Math.min(child.port.rise_capacitance, child.port.fall_capacitance);
			}
		}
		// Got the total capacitance loading the gate
	};

	this._updateValues = function(parent, child, input_port){ // Check and update the input and output slew rates, gate delays, and AAT
		var output_port;
		var timing_tables;

		var cell_rise_max, cell_fall_max, gate_delay_max;
		var rise_transition_max, fall_transition_max;

		var cell_rise_min, cell_fall_min;
		var rise_transition_min, fall_transition_min;
		for(var key in child.outputPorts){ // Most cases there is only one output port
			output_port = child.outputPorts[key];

			// Got maximum gate delay using this input slew rate
			cell_rise_max = timing_tables.cell_rise.getData(parent.output_slew.max, child.capacitance_load.max);
			cell_fall_max = timing_tables.cell_fall.getData(parent.output_slew.max, child.capacitance_load.max);
			gate_delay_max = Math.max(cell_rise_max, cell_fall_max); 

			child.AAT = Math.max(child.AAT, parent.AAT + gate_delay_max); // Update AAT

			if(parent.output_slew.max > child.input_slew.max){ // If the maximum input slew rate is a new maximum
				child.input_slew.max = parent.output_slew.max; // Update maximum input slew rate
				timing_tables = output_port[input_port.name].timing;

				// Update maximum output slew rate
				rise_transition_max = timing_tables.rise_transition.getData(child.input_slew.max, child.capacitance_load.max);
				fall_transition_max = timing_tables.fall_transition.getData(child.input_slew.max, child.capacitance_load.max);
				child.output_slew.max = Math.max(rise_transition_max, fall_transition_max);

				child.gate_delay.max = gate_delay_max; // Update maximum gate delay
			}

			if(parent.output_slew.min < child.input_slew.min){	// If the minimum input slew rate is a new minimum
				child.input_slew.min = parent.output_slew.min; // Update minimum input slew rate

				// Update miniumum output slew rate
				rise_transition_min = timing_tables.rise_transition.getData(child.input_slew.min, child.capacitance_load.min);
				fall_transition_min = timing_tables.fall_transition.getData(child.input_slew.min, child.capacitance_load.min);
				child.output_slew.min = Math.min(rise_transition_min, fall_transition_min);

				// Update minimum gate delay
				cell_rise_min = timing_tables.cell_rise.getData(child.output_slew.min, child.capacitance_load.min);
				cell_fall_min = timing_tables.cell_fall.getData(child.output_slew.min, child.capacitance_load.min);
			}
		}
	};

	this._clone = function(obj){
	    var copy;
	    if(null == obj || "object" != typeof obj) return obj; // Handle the 3 simple types, and null or undefined

	    if(obj instanceof Date){ // Handle Date
	        copy = new Date();
	        copy.setTime(obj.getTime());
	        return copy;
	    }
	    
	    if(obj instanceof Array){ // Handle Array
	        copy = [];
	        for(var i=0, len=obj.length; i<len; i++){
	            copy[i] = this._clone(obj[i]);
	        }
	        return copy;
	    }
	    
	    if(obj instanceof Object){ // Handle Object
	        copy = {};
	        for(var attr in obj){
	            if(obj.hasOwnProperty(attr)) copy[attr] = this._clone(obj[attr]);
	        }
	        return copy;
	    }
	    throw new Error("Unable to copy obj! Its type isn't supported.");
	};

	this.gates = new Array();
	this.gates.push("Origin"); // Dummy node
	for(var key in gates){ // Map to array conversion
		if(gates.hasOwnProperty(key)){
			this.gates.push(gates[key]);
		}
	}
	// TEMP FIX!
	this.gates.splice(1, 2);
	//
	this.constraints = constraints; // Constraints
	this.timing_graph = new Array(this.gates.length); // Structure to store the timing graph
	this.forward_ordering = new Array(); // Topological order of the nodes for foward traversal
	this.levels = new Array(); // Starting nodes

	// Constraints data
	this.input_delays = constraints.input_delays; // Constraint input delays (cell rise and cell fall)
	this.output_delays = constraints.output_delays; // Constraint output delays (cell rise and cell fall)
	this.input_slew = constraints.input_slew; // Constraint input slew rates (rise transition and fall transition)
	this.output_capacitance_load = constraints.output_capacitance_load; // Constraint output capacitance loads (maximum and minimum loads)
	this.clock = constraints.clock; // Constraint clock
	this.clock_node; // The cell modelling the clock

	// Initialize the timing graph
	for(var i=0; i<this.timing_graph.length; i++){
		this.timing_graph[i] = {
			children: [],
			parents: []
		};
	}

	this._fetchAndSetupClockNode(); // Locate clock node

	// Constructing the timing graph
	for(var i=1; i<this.gates.length; i++){
		if(this.gates[i].getInputs().length == 0 || this.gates[i].isFF()){ // Starting point of a timing path: Input pin / FF
			if(!this.gates[i].isClock){
				this.timing_graph[0].children.push({ // Origin points to child
					port: "Dummy",
					gate: i
				});
				this.timing_graph[i].parents.push(0); // Point to parent Origin

				this._buildTimingPath(this.gates[i], i);
			}
		}
	}
	// Timing path constructed

	for(var i=1; i<this.gates.length; i++){
		console.log(this.gates[i].instanceName + " " + this.gates[i].getInputs().length + " " + this.gates[i].getOutputs().length);
	}

	for(var i=0; i<this.timing_graph.length; i++){
		console.log(i);
		console.log("Children:");
		for(var j=0; j<this.timing_graph[i].children.length; j++){
			console.log(this.timing_graph[i].children[j].gate + " " + this.gates[this.timing_graph[i].children[j].gate].instanceName + " " + (i==0 ? "Dummy" : this.timing_graph[i].children[j].port.name));
		}
		console.log("Parents:");
		for(var j=0; j<this.timing_graph[i].parents.length; j++){
			console.log(this.timing_graph[i].parents[j]);
		}
	}
};

module.exports = STA;