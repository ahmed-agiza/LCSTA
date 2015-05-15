var Cell = require('./cell');

var STA = function(gates, constriants, net_capacitances, clock_skews){
	this.gates = gates; // Gates
	this.adjacency_list = new Array(gates.length); // Adjacency list
	this.timing_graph = new Array(gates.length); // Timing graph to model the timing paths

	// These will map the input pins to their delays
	this.input_delays = constraints.input_delays; // Constraint input delays
	this.output_delays = constraints.output_delays; // Constraint output delays

	this.clock = constraints.clock; // Constraints clock

	// Constructing Graph
	for(var i=0; i<this.gates.length; i++){
		this.adjacency_list[i] = {
			children: [],
			parents: []
		};
		var OP = this.gates[i].outputPorts;
		var IP = this.gates[i].inputPorts;
		for(var j=0; j<OP.length; j++){ // Children
			this.adjacency_list[i].children.push({
				pin: OP[j],
				gate: this.gates.indexOf(this.gates[i].outputs[OP[j]])
			});
		}
		for(var j=0; j<IP.length; j++){ // Parents
			this.adjacency_list[i].parents.push({
				pin: IP[j],
				gate: this.gates.indexOf(this.gates[i].inputs[IP[j]])
			});
		}
	}

	// Construct Timing Path
	for(var i=0; i<this.gates.length; i++){
		if(this.gates[i].inputPorts.length == 0 || this.gats[i].isFF){ // Start of timing path
			build_timing_path(this.timing_graph, this.gates[i], i); // Recursive building of the graph
		}
	}
	// Timing Path Constructed
};

STA.prototype.ArrivalTimeCalculation = function(){

};

STA.prototype.RequiredTimeCalculation = function(){

};

STA.prototype.GenerateTimingReport = function(){

};

function buildTimingPath(timing_graph, current, current_index){
	var children = current.getOutputs;
	for(var j=0; j<children.length; j++){ // Go over children
		var child_index = this.gates.indexOf(children[j]);
		timing_graph[current_index].push({ // Insert child node and pin in the path
			pin: getInputPort(current, children[j]),
			gate: child_index
		});
		if(!(children[j].getOutputs.length == 0 || children[j].isFF)){ // Not an end to a timing path
			buildTimingPath(timing_graph, children[j], child_index);	
		}
	}
}

function getInputPort(parent, child){ // Get child's input port that connects the parent to it
	for(k in child.inputPorts)
		if(child.inputs[child.inputPorts[k].name] == parent)
			return child.inputPorts[k].name;
}

function getSlack(AAT, RAT){

}

module.exports = STA;

function topological_sorting(){
	var temp_adj_list = this.adjacency_list;
	var starting_nodes = new Array();
	var selected;
	var child;
	for(var i=0; i<this.gates.length; i++){ // Getting starting nodes
		if(Object.keys(this.gates[i].inputs).length == 0){
			starting_nodes.push({
				index: i,
				gate: this.gates[i]
			});
		}
	}
	for(var i=0; i<temp_adj_list.length; i++){ // Getting starting nodes
		if(temp_adj_list[i].parents.length == 0){
			starting_nodes.push(i);
		}
	}

	while(starting_nodes.length > 0){
		selected = starting_nodes[0];
		starting_nodes.splice(0,1); // remove the first element
		this.layers.push(selected);
		for (var i=0; i<temp_adj_list[selected].children.length; i++){
			child = temp_adj_list[selected].children[i].gate;
			for(var j=0; j<temp_adj_list[child].parent.length; j++){
				if(temp_adj_list[child].parent[i].gate == selected){
					// Remove this edge
				}
			}
		}
	}
}

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
					else if(child.isFF) // FF
						initializeFF(child, child_index);
				}
				else {
					// Evaluate the capacitance load
					if(!calculated_capacitance[child_index])
				}
			}
		}
	};