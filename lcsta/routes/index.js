var express = require('express');
var multer = require('multer');
var fs = require('fs');
var flash = require('connect-flash');
var router = express.Router();

var Component = require('../models/component');
var Parser = require('../models/parser');
var GraphBuilder = require('../models/graph_builder');
var wire = Component.wire;
var and = Component.and;
var nand = Component.nand;
var or =Component.or;
var nor = Component.nor;
var xor = Component.xor;
var not = Component.not;
var edif = Component.EDIF;

function countArray(obj){ //Key-value array size counter.
	var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}

function getKey(object, value){
    for( var prop in object) {
        if(object.hasOwnProperty(prop)) {
             if( object[prop] === value )
                 return prop;
        }
    }
}

router.get('/', function(req, res){ //Netlist upload view.
	var x = {v: 5,
			 nx: null,
			 pr: null};
	var y = {v: 7,
			 nx: null,
			 pr: null};
	var z = {v: 11,
			 nx: null,
			 pr: null};
	y.nx = [x, z];
	x.v = 9;
	console.log(typeof y.nx[0]);
	res.render('index', {title: 'Logic Circuit Static Timing Analysis', message: req.flash('error')});
});

router.get('/about', function(req, res){ //Netlist upload view.
	res.render('about', {title: 'About LCSTA'});
});

router.get('/report', function(req, res){ //Netlist upload view.
	req.flash('error', 'Please select a Verilog netlist file to process.')
	res.redirect('/');
});


router.post('/report', function(req, res){ //Netlist file parser.
	if(typeof(req.files.netlist) === 'undefined'){
		console.log('No netlist uploaded');
		req.flash('error', 'Select a Verilog netlist file to process.');
		res.redirect('/');
		return;
	}
	if (req.body.stdcells != 'custom'){
		var filePath = './' + req.files.netlist.path; //Full file path.
		var content; //File content holder.
		fs.readFile(filePath, 'utf8', function read(err, data) { //Reading file content.
		    if (err) {
		    	req.flash('error', 'Select a Verilog netlist file to process.');
		        res.redirect('/');
		        fs.unlink(filePath); //Deleting uploaded file.
		    }else{
		    	content = data;
		    	Parser.parseNetlist(content, edif, function(err, gates, wires, warnings){
		    		if(err){
		    			console.log(err);
		    			res.render('report', { title: 'Timing Report',
		    									error: err,
		    									graphGates: JSON.stringify([]),
		    									graphWires: JSON.stringify([]),
		    									graphMapper: JSON.stringify([]),
		    									connectionWires: JSON.stringify([]),
		    									content: content});
		    			fs.unlink(filePath); //Deleting processed file.
		    		}else{
		    			var builder = new GraphBuilder(gates);
		    			builder.LongestPathLayering(); // Layering of the DAG
		    			builder.ProperLayering(); // Dummy nodes placement
		    			builder.CrossingReduction(); // Crossing reduction
		    			
		    			var graph_settings = {
		    				max_comp_w: 100,
		    				max_comp_h: 50,
		    				layer_spacing: 150,
		    				node_spacing: 50,
		    				left_marg: 10,
		    				top_marg: 10
		    			};
		    			var GraphingMaterial = builder.AssignAbsoluteValues(graph_settings); // Give Graph absolute values
		    			var graphMapper = edif.getJointMap(); //Mapping gates to logic digarams.
		    			var wiresMap = {};
		    			for(var i = 0; i < wires.length; i++)
		    				wiresMap[wires[i].id] = wires[i];
		    			var al = GraphingMaterial.adjaceny_list;
 		    			res.render('circuit', { title: 'Circuit',
		    									error: '',
		    									graphGates: JSON.stringify(GraphingMaterial.gates),
		    									graphWires: JSON.stringify(GraphingMaterial.adjaceny_list),
		    									graphMapper: JSON.stringify(graphMapper),
		    									connectionWires: JSON.stringify(wiresMap),
		    									warnings: JSON.stringify(warnings),
		    									content: content});
		    			fs.unlink(filePath); //Deleting processed file.
		    		}
		    	}); //Parsing file content.
				
				
		    }
		    
		});
	}else{
		var filePath = './' + req.files.netlist.path; //Full file path.
		if(typeof(req.files.stdcellfile) === 'undefined'){
			console.log('No stdcell file uploaded');
			req.flash('error', 'You must specify the custom standard cell library.');
			res.redirect('/');
			fs.unlink(filePath);
			return;
		}
		var stdCellFilePath = './' + req.files.stdcellfile.path;
		var stdCellCeontent;

		fs.readFile(stdCellFilePath, 'utf8', function read(err, data){
			if (err) {
		    	req.flash('error', 'Select a Verilog netlist file to process.');
		        res.redirect('/');
		        fs.unlink(filePath); //Deleting uploaded file.
		        fs.unlink(stdCellFilePath);
		    }else{
		    	stdCellContent = data;
		    	var content; //File content holder.
				fs.readFile(filePath, 'utf8', function read(err, data) { //Reading file content.
				    if (err) {
				    	console.log('READ ERROR');
				    	console.log(err);
				        res.status(500).send('Error');
				        fs.unlink(filePath); //Deleting uploaded file.
				        fs.unlink(stdCellFilePath);
				    }else{
				    	content = data;
				    	Parser.parseLibrary(stdCellContent, function(err, parsedEdif){
				    		if (err) {
				    			console.log('LIB ERROR');
						    	console.log(err);
						        res.status(500).send('Error');
						        fs.unlink(filePath); //Deleting uploaded file.
						        fs.unlink(stdCellFilePath);
				    		}else{
				    			Parser.parseNetlist(content, parsedEdif, function(err, gates, wires, warnings){
						    		if(err){
						    			console.log('NETLIST ERROR');
						    			console.log(err);
						    			res.render('circuit', { title: 'Circuit',
						    									error: err,
						    									graphGates: JSON.stringify([]),
						    									graphWires: JSON.stringify([]),
						    									graphMapper: JSON.stringify([]),
						    									connectionWires: JSON.stringify([]),
						    									content: content});
						    			fs.unlink(filePath); //Deleting processed file.
						    			fs.unlink(stdCellFilePath);
						    		}else{
						    			var builder = new GraphBuilder(gates);
						    			builder.LongestPathLayering(); // Layering of the DAG
						    			builder.ProperLayering(); // Dummy nodes placement
						    			builder.CrossingReduction(); // Crossing reduction
						    			
						    			var graph_settings = {
						    				max_comp_w: 100,
						    				max_comp_h: 50,
						    				layer_spacing: 150,
						    				node_spacing: 50,
						    				left_marg: 10,
						    				top_marg: 10
						    			};
						    			var GraphingMaterial = builder.AssignAbsoluteValues(graph_settings); // Give Graph absolute values
						    			var graphMapper = parsedEdif.getJointMap(); //Mapping gates to logic digarams.
						    			var wiresMap = {};
						    			for(var i = 0; i < wires.length; i++)
						    				wiresMap[wires[i].id] = wires[i];
						    			res.render('circuit', { title: 'Circuit',
						    									error: '',
						    									graphGates: JSON.stringify(GraphingMaterial.gates),
						    									graphWires: JSON.stringify(GraphingMaterial.adjaceny_list),
						    									graphMapper: JSON.stringify(graphMapper),
						    									connectionWires: JSON.stringify(wiresMap),
						    									warnings: JSON.stringify(warnings),
						    									content: content});
						    			fs.unlink(filePath); //Deleting processed file.
						    			fs.unlink(stdCellFilePath);
						    		}
						    	}); //Parsing file content.
				    		}
				    	});
				    	
						
						
				    }
				    
				});
		    }
		});

		
	}
	

	
});

module.exports = router;
