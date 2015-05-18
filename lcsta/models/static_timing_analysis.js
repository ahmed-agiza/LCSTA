"use strict";

var Cell = require("./cell");

var STA = function(gates, constraints){

	this.arrivalTimeCalculation = function(){ // Calculate arrival time
		this._topologicalSorting(true); // Forward topological sorting for the graph

		var calculated_capacitance = new Array(this.gates.length);
		var current;
		var current_index;
		var child_index;
		var child;
		var input_port;
		var start_flag;
		for(var i=0; i<calculated_capacitance.length; i++){
			calculated_capacitance[i] = false;
		}

		for(var i=0; i<this.forward_ordering.length; i++){
			current_index = this.forward_ordering[i];
			current = this.gates[current_index];
			for(var j=0; this.timing_graph[current_index].children.length; j++){
				child_index = this.timing_graph[current_index].children[j].gate;
				child = this.gates[child_index];
				input_port = this.timing_graph[current_index].children[j].port;
				start_flag = (current == 0);

				this._updateValues(current, child, child_index, input_port, start_flag); // Update the values on the nodes
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

	this._fetchAndSetupClockNode = function(){ // Find the clock node
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
		this.visited[current_index] = true; // Mark the node as visited
		for(var i=0; i<children.length; i++){
			child_index = this.gates.indexOf(children[i]);

			this.timing_graph[current_index].children.push({ // Point to child
				port: this._getInputPort(current, children[i]),
				gate: child_index
			});
			this.timing_graph[child_index].parents.push(current_index); // Point to parent

			if(!(children[i].is_output || children[i].isFF())) // Not an end of a timing path
				if(!this.visited[child_index]) // If the node wasn't visited previously
					this._buildTimingPath(children[i], child_index);
		}
	};

	this._getInputPort = function(parent, child){ // Get the child's input port the parent connects to
		for(var key in child.inputPorts)
			if(child.inputs[key][0] == parent)
				return child.inputPorts[key];
	};

	this._topologicalSorting = function(forward){ // Topologically sort the nodes for analysis
		var temp_timing_graph = this._clone(this.timing_graph); // Clone the graph as it will be modified during the process
		var starting = new Array();
		var current;
		var child_index;
		var element_index;

		if(forward){ // Topological sorting for the forward traversal
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
		}
		else{ // Topological sorting for the reverse traversal
			for(var i=1; i<this.gates.length; i++){
				if(this.gates[i].is_output || this.gates[i].isFF()){ // If it is an ending node
					starting.push(i);
				}
			}
			while(starting.length > 0){
				current = starting[0];
				starting.splice(0, 1); // remove the first element
				this.backward_ordering.push(current);
				for(var i=0; i<temp_timing_graph[current].parents.length; i++){ // Go over parents
					child_index = temp_timing_graph[current].parents[i];
					for(var j=0; j<temp_timing_graph[child_index].children.length; j++){ // Find the edge from parent to child
						if(temp_timing_graph[child_index].children[j].gate == current){
							element_index = j;
							break;
						}
					}
					temp_timing_graph[child_index].children.splice(element_index, 1); // Remove the edge

					if(temp_timing_graph[child_index].children.length == 0) // No more incoming edges
						starting.push(child_index);
				}
			}
		}
	};

	this._evaluateCapacitanceLoad = function(node, node_index){ // Calculate the capacitance load for a cell
		if(calculated_capacitance[node_index]) return; // If it was already evaluated
		if(node.is_output){ // If this is an output pin
			var output_capacitance;
			output_capacitance = this.output_capacitance_load[node.instanceName];
			node.capacitance_load.max = Math.max(output_capacitance.rise_capacitance, output_capacitance.fall_capacitance);
			node.capacitance_load.min = Math.min(output_capacitance.rise_capacitance, output_capacitance.fall_capacitance);
		}
		else{
			var child;
			var child_index;
			var port;
			for(var key in node.outputPort){ // One output port for simple gates
				for(var i=0; i<this.timing_graph[node_index].children.length; i++){
					child_index = this.timing_graph[node_index].children[i].gate;
					child = this.gates[child_index];
					port = this.timing_graph[node_index].children[i].port;

					// Add the net capacitance to both the minimum and the maximum
					node.capacitance_load.max += node.outputPort[key].net_capacitance[child.instanceName][port];
					node.capacitance_load.min += node.outputPort[key].net_capacitance[child.instanceName][port];

					// Add the maximum and minimum capacitance as a result of the child port
					node.capacitance_load.max += Math.max(port.rise_capacitance, port.fall_capacitance);
					node.capacitance_load.min += Math.min(port.rise_capacitance, port.fall_capacitance);
				}
			}
		}
		calculated_capacitance[node_index] = true; // Mark as evaluated
		// Got the total capacitance loading the gate
	};

	this._updateValues = function(parent, child, child_index, input_port, start_flag){ // Update the values for the node
		this._evaluateCapacitanceLoad(child, child_index); // Evaluate capacitance for the node

		var timing_tables;
		var clock_port;
		var input_slew;
		var input_delay;
		var rise_transition_max, rise_transition_min;
		var fall_transition_max, fall_transition_min;
		var cell_rise_max, cell_fall_max;
		var cell_rise_min, cell_fall_min;
		var new_max = false;
		var new_min = false;

		if(child.is_output){ // Handled separately since the output pin doesn't have output ports
			child.AAT = max(child_AAT, parent.AAT + parent.gate_delay.max + this.output_delays[child.instanceName]);
			return;
		}

		for(var key in child.outputPort){ // Most cases it is a single output port
			timing_tables = child.outputPort[key][input_port.name].timing;

			// ------------ Input slew ------------
			// Input pin
			if(child.is_input){
				if(child.instanceName in this.input_slew){
					input_slew = this.input_slew[child.instanceName];
					child.input_slew.max = Math.max(input_slew.rise_transition, input_slew.fall_transition);
					child.input_slew.min = Math.min(input_slew.rise_transition, input_slew.fall_transition);
				}
				else{
					child.input_slew.max = 0;
					child.input_slew.min = 0;
				}
			}

			// Starting FF
			else if(child.isFF() && start_flag){
				child.input_slew.max = this.clock_node.output_slew.max;
				child.input_slew.min = this.clock_node.output_slew.min;	
			}

			// Normal handling
			else{
				if(parent.output_slew.max > child.input_slew.max){ // If the maximum input slew rate is a new maximum
					child.input_slew.max = parent.output_slew.max;
					new_max = true;
				}
				if(parent.output_slew.min < child.input_slew.min){ // If the minimum input slew rate is a new minimum
					child.input_slew.min = parent.output_slew.min;
					new_min = true;
				}
			}
			// ------------------------------------

			// ------------ Output slew -----------
			// Input pin
			if(child.is_input){
				child.output_slew.max = child.input_slew.max;
				child.output_slew.min = child.input_slew.min;
			}

			// Starting FF
			else if(child.isFF() && start_flag){
				for(var key in child.inputPorts){ // Get the clock port
					if(child.inputPorts[key].clock){
						clock_port = child.inputPorts[key];
						break;
					}
				}
				timing_tables = child.outputPort[key][clock_port.name].timing; // Get the timing table with respect to the clock

				rise_transition_max = timing_tables.rise_transition.getData(child.input_slew.max, child.capacitance_load.max);
				fall_transition_max = timing_tables.fall_transition.getData(child.input_slew.max, child.capacitance_load.max);
				child.output_slew.max = Math.max(rise_transition_max, fall_transition_max);

				rise_transition_min = timing_tables.rise_transition.getData(child.input_slew.min, child.capacitance_load.min);
				fall_transition_min = timing_tables.fall_transition.getData(child.input_slew.min, child.capacitance_load.min);
				child.output_slew.min = Math.min(rise_transition_min, fall_transition_min);
			}

			// Normal handling
			else{
				if(new_max){
					rise_transition_max = timing_tables.rise_transition.getData(child.input_slew.max, child.capacitance_load.max);
					fall_transition_max = timing_tables.fall_transition.getData(child.input_slew.max, child.capacitance_load.max);
					child.output_slew.max = Math.max(rise_transition_max, fall_transition_max);
				}

				if(new_min){
					rise_transition_min = timing_tables.rise_transition.getData(child.input_slew.min, child.capacitance_load.min);
					fall_transition_min = timing_tables.fall_transition.getData(child.input_slew.min, child.capacitance_load.min);
					child.output_slew.min = Math.min(rise_transition_min, fall_transition_min);
				}
			}
			// ------------------------------------	

			// ------------ Gate delay ------------
			// Input pin
			if(child.is_input){
				if(child.instanceName in this.input_delays){
					input_delay = this.input_delays[child.instanceName];
					child.gate_delay.max = Math.max(input_delay.cell_rise, input_delay.cell_fall);
					child.gate_delay.min = Math.min(input_delay.cell_rise, input_delay.cell_fall);
				}
				else{
					child.gate_delay.max = 0;
					child.gate_delay.min = 0;
				}
			}

			// Starting FF
			else if(child.isFF() && start_flag){
				timing_tables = child.outputPort[key][clock_port.name].timing; // Get the timing table with respect to the clock

				cell_rise_max = timing_tables.cell_rise.getData(parent.output_slew.max, child.capacitance_load.max);
				cell_fall_max = timing_tables.cell_fall.getData(parent.output_slew.max, child.capacitance_load.max);
				child.gate_delay.max = Math.max(cell_rise_max, cell_fall_max);

				cell_rise_min = timing_tables.cell_rise.getData(parent.output_slew.min, child.capacitance_load.min);
				cell_fall_min = timing_tables.cell_fall.getData(parent.output_slew.min, child.capacitance_load.min); 
				child.gate_delay.min = Math.max(cell_rise_min, cell_fall_min);
			}

			// Normal handling
			else{
				if(new_max){
					cell_rise_max = timing_tables.cell_rise.getData(parent.output_slew.max, child.capacitance_load.max);
					cell_fall_max = timing_tables.cell_fall.getData(parent.output_slew.max, child.capacitance_load.max);
					child.gate_delay.max = Math.max(cell_rise_max, cell_fall_max);
				}

				if(new_min){
					cell_rise_min = timing_tables.cell_rise.getData(parent.output_slew.min, child.capacitance_load.min);
					cell_fall_min = timing_tables.cell_fall.getData(parent.output_slew.min, child.capacitance_load.min); 
					child.gate_delay.min = Math.max(cell_rise_min, cell_fall_min);
				}
			}
			// ------------------------------------

			// --------------- AAT ----------------
			// Input pin
			if(child.is_input){
				child.AAT = child.gate_delay.max; // AAT = input delay
			}

			// Starting FF
			else if(child.isFF() && start_flag){
				child.AAT_FF_start = child.clock_skew; // AAT = clock skew
			}

			// Ending FF
			else if(child.isFF()){
				child.AAT = max(child_AAT, parent.AAT + parent.gate_delay.max); // ADD THE SETUP TIME!
			}

			// Normal handling
			else{
				if(parent.isFF()) // If parent is a FF
					child.AAT = max(child.AAT, parent.AAT_FF_start + parent.gate_delay.max);
				else
					child.AAT = max(child.AAT, parent.AAT + parent.gate_delay.max);
			}
			// ------------------------------------
		}	
	}

	this._clone = function(obj){ // Cloning any type of object
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

	// Setup array of gates
	this.gates = new Array();
	var origin = new Cell();
	origin.is_dummy = true; // Origin cell
	this.gates.push(origin);
	for(var key in gates) // Map to array convertion
		if(gates.hasOwnProperty(key))
			this.gates.push(gates[key]);

	this.constraints = constraints; // Constraints
	this.timing_graph = new Array(this.gates.length); // Structure to store the timing graph
	this.visited = new Array(this.gates.length); // Used for building the graph
	this.forward_ordering = new Array(); // Topological order of the nodes for foward traversal
	this.backward_ordering = new Array(); // Topological order of the nodes for backward traversal

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
		this.visited[i] = false;
	}

	this._fetchAndSetupClockNode(); // Locate clock node

	// Constructing the timing graph
	for(var i=1; i<this.gates.length; i++){
		if(this.gates[i].is_input || this.gates[i].isFF()){ // Starting point of a timing path: Input pin / FF
			if(!this.gates[i].isClock){
				this.timing_graph[0].children.push({ // Origin points to child
					port: false,
					gate: i
				});
				this.timing_graph[i].parents.push(0); // Point to parent Origin

				this._buildTimingPath(this.gates[i], i);
				this.visited[0] = true;
			}
		}
	}
	// Timing path constructed
};