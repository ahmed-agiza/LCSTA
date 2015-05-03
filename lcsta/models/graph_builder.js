/*Graph Builder Model*/

var Component = require('./component');

var GraphBuilder = function(gates){
	this.layers = new Array(1);
	this.layers[0] = new Array();
	this.gates = gates;
	this.adjaceny_list = new Array(gates.length); // Adjaceny list to build DAG
	this.reversed_edges = new Array();
	this.double_cycles = new Array();

	// Starting values for absolute graphing
	this.width = 0;
	this.height = 0;
	this.max_number_of_layers = 0;
	this.max_number_of_nodes = 0;

	this.MAX_COMPONENT_WIDTH = 100;
	this.MAX_COMPONENT_HEIGHT = 50;
	this.LAYER_SPACING = 150;
	this.NODE_SPACING = 50;
	this.LEFT_MARGIN = 10;
	this.TOP_MARGIN = 10;
	this.LAYER_INCREMENTS = this.MAX_COMPONENT_WIDTH + this.LAYER_SPACING;
	this.MIN_NODE_INCREMENTS = this.MAX_COMPONENT_HEIGHT + this.NODE_SPACING;

	for(var i=0; i<gates.length; i++){
		this.adjaceny_list[i] = new Array();
		var neighbours = this.gates[i].getOutputGates(0);
		for(var j=0; j<neighbours.length; j++){
			this.adjaceny_list[i].push(this.gates.indexOf(neighbours[j]));
		}
	}
	// Graph constructed
};

GraphBuilder.prototype.LongestPathLayering = function(){ // Assigning the x-coordinate of the gates
	this.CyclesRemoval(); // Remove any cycles that exist (DAG constructed)

	var assigned = new Array(); // Nodes assigned
	var included = new Array(); // Sublayered nodes
	var current_layer = 0;

	while(assigned.length < this.gates.length){
		var selected = false;
		for(var i=0; i<this.gates.length; i++){
			if(assigned.indexOf(i) == -1){ // Not assigned
				var subset = true;
				for(var j=0; j<this.adjaceny_list[i].length; j++){
					if(included.indexOf(this.adjaceny_list[i][j]) == -1){ // Node neighbours not sublayered
						subset = false;
						break;
					}
				}
				if(subset){
					selected = true;
					this.gates[i].rx = current_layer; // Assign layer
					this.layers[current_layer].push(i); // Insert in layer structure
					assigned.push(i);
				}
			}
		}
		if(!selected){ // No nodes selected
			selected = true;
			current_layer = current_layer + 1;
			this.layers.push(new Array()); // Extend layer structure
			included = merge(included, assigned);
		}
	}
	// Layered DAG constructed
};

GraphBuilder.prototype.ProperLayering = function(){ // Introducing dummy nodes
	for(var i=0; i<this.gates.length; i++){
		for(var j=0; j<this.adjaceny_list[i].length; j++){
			if(this.gates[i].rx - this.gates[this.adjaceny_list[i][j]].rx > 1){ // If we have long edge
				var is_reversed_edge = false;
				var r_edge;
				for(var k=0; k<this.reversed_edges; k++){
					if(this.reversed_edges[k].child == i && this.reversed_edges[k].parent == this.adjaceny_list[i][j]){ // Match
						is_reversed_edge = true;
						r_edge = k;
					}
				}

				var dummy;
				var children;
				var end_node_index = this.adjaceny_list[i][j]; // end node
				this.adjaceny_list[i].splice(j, 1); // Remove long edge

				dummy = new Component.component();
				dummy.dummy = true;
				dummy.rx = this.gates[i].rx - 1;
				this.gates.push(dummy);
				this.adjaceny_list[i].push(this.gates.length-1);
				this.layers[dummy.rx].push(this.gates.length-1);
				if(is_reversed_edge){
					this.reversed_edges[r_edge].path.splice(1, 0, this.gates.length-1);
				}

				for(var k=2; k<this.gates[i].rx - this.gates[this.adjaceny_list[i][j]].rx; k++){
					dummy = new Component.component();
					dummy.dummy = true;
					dummy.rx = this.gates[i].rx - k;
					this.gates.push(dummy);
					this.layers[dummy.rx].push(this.gates.length-1);
					if(is_reversed_edge){
						this.reversed_edges[r_edge].path.splice(1, 0, this.gates.length-1);
					}

					children = new Array();
					children.push(this.gates.length - 1);
					this.adjaceny_list.push(children); // Point to next dummy
				}

				children = new Array();
				children.push(end_node_index);
				this.adjaceny_list.push(children); // Last dummy to end node
			}

			// Placing 2 nodes at maximum per long edge
			/*if(this.gates[i].x - gates[this.adjaceny_list[i][j]].x > 1){
				var dummy = new Component();
				dummy.dummy = true;
				dummy.x = this.gates[i].x - 1;
				var end_node_index = this.adjaceny_list[i][j]; // end node
				var end_node_x = gates[this.adjaceny_list[i][j]].x; // end node x-coordinate

				this.adjaceny_list[i].splice(j, 1); // Remove long edge
				this.gates.push(dummy);
				this.adjaceny_list[i].push(this.gates.length - 1); // Point to dummy
				var children = new Array();
				if(this.gates[i].x - gates[this.adjaceny_list[i][j]].x > 2){ // Inserting 2 dummy nodes
					var dummy2 = new Component();
					dummy2.dummy = true;
					dummy2.x = end_node_x + 1;

					this.gates.push(dummy2);
					children.push(this.gates.length - 1);
					this.adjaceny_list.push(children); // Dummy to dummy2
				}
				children = new Array();
				children.push(end_node_index);
				this.adjaceny_list.push(children); // Dummy or dummy2 to end node (depends on single or double insertion)
			}*/
		}
	}
	// Properly Layered DAG constructed
};

GraphBuilder.prototype.CrossingReduction = function(){
	var random_index_array = new Array();
	for(var i=0; i<this.layers[this.layers.length-1].length; i++){
		random_index_array[i] = i;
	}
	shuffle(random_index_array);
	for(var i=0; i<this.layers[this.layers.length-1].length; i++){ // Assign left most layer (right) with random y locations
		this.gates[this.layers[this.layers.length-1][i]].ry = random_index_array[i];
	}
	this.layers[this.layers.length-1].sort(compareY(this.gates));

	var forgiveness_number = 1000;
	var lowest_crossings = Number.MAX_VALUE;
	var final_gates = this.gates;
	var final_layers = this.layers;
	var crossings;

	while(forgiveness_number > 0){
		crossings = 0;
		for(var i=this.layers.length-1; i>0; i--){ // Going left to right
			BaryCenter(this.gates, this.adjaceny_list, this.layers, i, i-1, false);
			for(var j=0; j<this.layers[i-1].length; j++){ // Map barycenter to relative y-coordinate
				this.gates[this.layers[i-1][j]].ry = j;
			}
			crossings += LevelCrossings(this.gates, this.adjaceny_list, this.layers[i], this.layers[i-1]);
		}
		//console.log(forgiveness_number);
		//console.log(crossings+ " " + lowest_crossings);
		if(crossings < lowest_crossings){
			lowest_crossings = crossings;
			final_gates = this.gates;
			final_layers = this.layers;
		}
		else{
			forgiveness_number--;
		}
		if(forgiveness_number <= 0)
			break;

		crossings = 0;
		for(var i=0; i<this.layers.length-1; i++){ // Going right to left
			BaryCenter(this.gates, this.adjaceny_list, this.layers, i, i+1, true);
			for(var j=0; j<this.layers[i+1].length; j++){ // Map barycenter to relative y-coordinate
				this.gates[this.layers[i+1][j]].ry = j;
			}
			crossings += LevelCrossings(this.gates, this.adjaceny_list, this.layers[i+1], this.layers[i]);
		}
		//console.log(forgiveness_number);
		//console.log(crossings+ " " + lowest_crossings);
		if(crossings < lowest_crossings){
			lowest_crossings = crossings;
			final_gates = this.gates;
			final_layers = this.layers;
		}
		else{
			forgiveness_number--;
		}
	}

	this.gates = final_gates;
	this.layers = final_layers;

	/*for(var i=0; i<this.layers.length; i++){ // Map barycenter to relative y-coordinate
		for(var j=0; j<this.layers[i].length; j++){
			this.gates[this.layers[i][j]].ry = j;
		}
	}*/

	// Restore the original orientation of the graph
	this.RestoreCycles();
	this.RestoreDoubleCycles();
	// Cross Reduced Properly Layered DAG constructed
};

function LevelCrossings(gates, adjaceny_list, parent_layer, child_layer){
	var crossings = 0;
	for(var i=0; i<parent_layer.length-1; i++){
		for(var j=0; j<adjaceny_list[parent_layer[i]].length; j++){
			for(var k=i+1; k<parent_layer.length; k++){
				for(var m=0; m<adjaceny_list[parent_layer[k]].length; m++){
					if(gates[adjaceny_list[parent_layer[i]][j]].ry > gates[adjaceny_list[parent_layer[k]][m]].ry){
						crossings++;
					}
				}
			}
		}
	}
	/*console.log(parent_layer);
	console.log(child_layer);
	console.log("Adjaceny List");
	for(var i=0; i<parent_layer.length; i++){
		console.log(parent_layer[i] + ": " + adjaceny_list[parent_layer[i]]);
	}
	console.log("Crossings: " + crossings);
	console.log("-------------------");*/

	return crossings;
}

function BaryCenter(gates, adjaceny_list, layers, layer1, layer2, is_reversed){
	for(var i=0; i<layers[layer2].length; i++){
		gates[layers[layer2][i]].ry = 0;
	}

	if(!is_reversed){
		for(var i=0; i<layers[layer2].length; i++){ // Sum
			for(var j=0; j<layers[layer1].length; j++){
				if(adjaceny_list[layers[layer1][j]].indexOf(layers[layer2][i]) != -1){ // is child
					gates[layers[layer2][i]].ry = gates[layers[layer2][i]].ry + j;
				}
			}
		}

		for(var i=0; i<layers[layer2].length; i++){ // Barycenter
			if(gates[layers[layer2][i]].inputs.length != 0){
				gates[layers[layer2][i]].ry = gates[layers[layer2][i]].ry * (1/gates[layers[layer2][i]].inputs.length);
			}
			else{
				gates[layers[layer2][i]].ry = 0; // Locate the free nodes initially at the top
			}
		}
	}

	else{
		for(var i=0; i<layers[layer2].length; i++){
			for(var j=0; j<layers[layer1].length; j++){
				if(adjaceny_list[layers[layer2][i]].indexOf(layers[layer1][j]) != -1){ // is parent
					gates[layers[layer2][i]].ry = gates[layers[layer2][i]].ry + j;
				}
			}
		}

		for(var i=0; i<layers[layer2].length; i++){
			gates[layers[layer2][i]].ry = gates[layers[layer2][i]].ry * (1/gates[layers[layer2][i]].outputs.length);
		}
	}

	layers[layer2].sort(compareY(gates)); // Sort by barycenter
}

GraphBuilder.prototype.RemoveDoubleCycles = function(){
	for(var i=0; i<this.adjaceny_list.length; i++){
		for(var j=0; j<this.adjaceny_list[i].length; j++){
			var index;
			index = this.adjaceny_list[this.adjaceny_list[i][j]].indexOf(i);
			if(index != -1){ // 2-Cycle
				this.adjaceny_list[this.adjaceny_list[i][j]].splice(index, 1);
				this.double_cycles.push({
					parent: this.adjaceny_list[i][j],
					child: i
				});
			}
		}
	}
};

GraphBuilder.prototype.CyclesRemoval = function(){
	this.RemoveDoubleCycles(); // Removing Double Cycles

	var left = new Array();
	var right = new Array();
	var recheck_sink, recheck_source;
	var max_delta, max_delta_node;
	var temp_graph = new Array(this.adjaceny_list.length);

	for(var i=0; i<this.adjaceny_list.length; i++){ // Construct a copy
		var temp_arr = new Array();
		for(var j=0; j<this.adjaceny_list[i].length; j++){
			temp_arr.push(this.adjaceny_list[i][j]);
		}
		temp_graph[i] = temp_arr;
	}

	var reverse_graph = new Array(temp_graph.length);
	var counter = temp_graph.length;
	var node_sequence = new Array();

	// Setup reverse graph
	for(var i=0; i<reverse_graph.length; i++){
		reverse_graph[i] = new Array();
	}
	for(var i=0; i<temp_graph.length; i++){
		for(var j=0; j<temp_graph[i].length; j++){
			reverse_graph[temp_graph[i][j]].push(i);
		}
	}

	while(counter != 0){
		recheck_sink = true;
		recheck_source = true;

		while(recheck_sink){ // Remove all sinks
			recheck_sink = false;
			for(var i=0; i<temp_graph.length; i++){
				if(typeof(temp_graph[i]) === "undefined")
					continue;
				if(temp_graph[i].length == 0){ // Found sink
					recheck_sink = true;
					counter--;
					right.unshift(i); // Prepend sink to right
					// Remove node from graph
					delete temp_graph[i];
					delete reverse_graph[i]; 

					for(var j=0; j<temp_graph.length; j++){ // Remove connections
						if(typeof(temp_graph[j]) === "undefined")
							continue;
						var index = temp_graph[j].indexOf(i);
						if(index != -1)
							temp_graph[j].splice(index, 1);
					}
				}
			}
		}

		while(recheck_source){ // Remove all sources
			recheck_source = false;
			for(var i=0; i<reverse_graph.length; i++){
				if(typeof(reverse_graph[i]) === "undefined")
					continue;
				if(reverse_graph[i].length == 0){ // Found source
					recheck_source = true;
					counter--;
					left.push(i); // Append source to left
					// Remove node from graph
					delete temp_graph[i];
					delete reverse_graph[i];

					for(var j=0; j<reverse_graph.length; j++){
						if(typeof(reverse_graph[j]) === "undefined")
							continue;
						var index = reverse_graph[j].indexOf(i);
						if(index != -1)
							reverse_graph[j].splice(index, 1);
					}
				}
			}
		}

		if(counter != 0){
			delta = Number.NEGATIVE_INFINITY;
			for(var i=0; i<temp_graph.length; i++){
				if(typeof(temp_graph[i]) === "undefined")
					continue;
				if(temp_graph[i] - reverse_graph[i] > delta){ // Maximum outdegree - indegree
					delta = temp_graph[i] - reverse_graph[i];
					max_delta_node = i;
				}
			}
			counter--;
			left.push(max_delta_node); // Append maximum delta node to left
			// Remove node from graph
			delete temp_graph[max_delta_node];
			delete reverse_graph[max_delta_node];
		}
	}
	node_sequence = left.concat(right); // Generate node sequence
	var index, index1, index2;
	for(var i=0; i<this.adjaceny_list.length; i++){
		for(var j=0; j<this.adjaceny_list[i].length; j++){
			index1 = node_sequence.indexOf(i);
			index2 = node_sequence.indexOf(this.adjaceny_list[i][j]);
			if(index1 > index2){ // Edge to be reversed
				var path = new Array();
				path.push(i);
				path.push(this.adjaceny_list[i][j]);
				this.reversed_edges.push({
					parent: i,
					child: this.adjaceny_list[i][j],
					path: path
				});
				// Reverse edge
				this.adjaceny_list[this.adjaceny_list[i][j]].push(i);
				index = this.adjaceny_list[i].indexOf(this.adjaceny_list[i][j]);
				this.adjaceny_list[i].splice(index, 1);
			}
		}
	}
};

GraphBuilder.prototype.RestoreCycles = function(){
	var index;
	for(var i=0; i<this.reversed_edges.length; i++){
		for(var j=0; j<this.reversed_edges[i].path.length-1; j++){
			this.adjaceny_list[this.reversed_edges[i].path[j]].push(this.reversed_edges[i].path[j+1]);
		}
		for(var j=this.reversed_edges[i].path.length-1; j>0; j--){
			index = this.adjaceny_list[this.reversed_edges[i].path[j]].indexOf(this.reversed_edges[i].path[j-1]);
			this.adjaceny_list[this.reversed_edges[i].path[j]].splice(index, 1);
		}
	}
};

GraphBuilder.prototype.RestoreDoubleCycles = function(){
	for(var i=0; i<this.double_cycles.length; i++){
		this.adjaceny_list[this.double_cycles[i].parent].push(this.double_cycles[i].child);
	}
};

GraphBuilder.prototype.AssignAbsoluteValues = function(settings){
	// Apply settings
	if(settings.hasOwnProperty("max_comp_w"))
		this.MAX_COMPONENT_WIDTH = settings.max_comp_w;
	if(settings.hasOwnProperty("max_comp_h"))
		this.MAX_COMPONENT_HEIGHT = settings.max_comp_h;
	if(settings.hasOwnProperty("layer_spacing"))
		this.LAYER_SPACING = settings.layer_spacing;
	if(settings.hasOwnProperty("node_spacing"))
		this.NODE_SPACING = settings.node_spacing;
	if(settings.hasOwnProperty("left_marg"))
		this.LEFT_MARGIN = settings.left_marg;
	if(settings.hasOwnProperty("top_marg"))
		this.TOP_MARGIN = settings.top_marg;

	this.max_number_of_layers = this.layers.length;
	this.width = this.max_number_of_layers * this.LAYER_INCREMENTS + this.LEFT_MARGIN;
	for(var i=0; i<this.layers.length; i++){
		if(this.layers[i].length > this.max_number_of_nodes){
			this.max_number_of_nodes = this.layers[i].length;
		}
	}
	this.height = this.max_number_of_nodes * this.MIN_NODE_INCREMENTS + this.TOP_MARGIN;

	for(var i=this.layers.length-1; i>=0; i--){
		var node_increments = (this.height - this.LEFT_MARGIN) / this.layers[i].length;
		for(var j=0; j<this.layers[i].length; j++){
			this.gates[this.layers[i][j]].setX(
				(this.layers.length-1 - this.gates[this.layers[i][j]].rx) * this.LAYER_INCREMENTS
				+ (i == this.layers.length-1 ? this.LEFT_MARGIN : 0)
			);
			this.gates[this.layers[i][j]].setY(
				this.gates[this.layers[i][j]].ry * node_increments
				+ (j == 0 ? this.TOP_MARGIN : 0)
			);
		}
	}

	/*for(var i=0; i<this.layers.length; i++){
		for(var j=0; j<this.layers[i].length; j++){
			console.log("GATE: " + this.layers[i][j]
				+ " AX: " + this.gates[this.layers[i][j]].rx
				+ " AY: " + this.gates[this.layers[i][j]].ry
				+ " X: " + this.gates[this.layers[i][j]].x
				+ " Y: " + this.gates[this.layers[i][j]].y);
		}
	}*/

	// An object with the required data to plot the circuit
	return {
		width: this.width,
		height: this.height,
		gates: this.gates,
		adjaceny_list: this.adjaceny_list
	};
};

function compareY(gates){
	return function(a, b){
		if(gates[a].ry < gates[b].ry) return -1;
		if(gates[a].ry > gates[b].ry) return 1;
		return 0;
	};
}

function shuffle(array){ // Shuffing function
	var currentIndex = array.length, temporaryValue, randomIndex ;
	// While there remain elements to shuffle...
  	while (0 !== currentIndex) {
	    // Pick a remaining element...
	    randomIndex = Math.floor(Math.random() * currentIndex);
	    currentIndex -= 1;

	    // And swap it with the current element.
	    temporaryValue = array[currentIndex];
	    array[currentIndex] = array[randomIndex];
	    array[randomIndex] = temporaryValue;
	}
	return array;
}

function merge(array1, array2){ // Union of 2 arrays
	var array = array1;
    for(var i = 0; i < array2.length; i++){
        if(array.indexOf(array2[i]) === -1){
            array.push(array2[i]);
        }
    }
    return array;
};

module.exports = GraphBuilder;