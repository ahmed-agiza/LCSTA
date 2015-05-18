"use strict";

var Cell = require('./cell').cell;
var Connect = require('./cell').connect;
var TemplateCell = require('./cell').templateCell;

var TPS = require('./thinplate/thinplate');


/****Regular Expressions Generators****/
function getAttributeRegex(attr){
	return new RegExp('\\s*' + attr + '\\s*:\\s*([\\w\\"\\. ,\\(\\)\\+\\-\\*\\/!~\\d]+)\\s*;\\s*', 'm');
}

function getAllAttributesRegex(){
	return new RegExp('\\s*(([\\"\\.\\w]+)\\s*:\\s*([\\w\\"\\. ,\\(\\)\\+\\-\\*\\/!~]+);)+\\s*', 'gm');
}

function getLibraryRegex(){
	return new RegExp('library\\s*\\(\\s*(.*)\\s*\\)\\s*{([^]+)}', 'm')
}

function getBracketRegex(){
	return new RegExp('{([^]+)}');
}

function getNumberRegex(){
	return new RegExp('^\\s*(\\-?\\d+(\\.\\d+)?\\s*)$');
}

function getQuotedRegex(){
	return new RegExp('\\s*\\"([\\w\\"\\. ,\\(\\)\\+\\-\\*\\/!~\\d]+)\\"\\s*', 'm');
}

function getQuotationsRegex(){
	return new RegExp('\\s*\\"\\s*([\\w\\. ,\\(\\)\\+\\-\\*\\/!~]+)\\s*\\"\\s*', 'mg');
}

function getFunctionRegex(functionName){
	return new RegExp('\\s*' + functionName + '\\s*\\((\\-?\\d+.?[\\d+]?)\\s*,\\s*(\\w+)\\)\\s*;\\s*', 'm')
}

function getOpeartionRegex(operationName){
	return new RegExp('\\s*' + operationName + '\\s*\\(\\s*([\\\\ ,\\w\\"\\.\n\\-]+)\\s*\\)\\s*;\\s*', 'm');
}

function getSimpleScopeRegex(scopeName){
	return new RegExp('\\s*' + scopeName + '\\s*\\(\\s*(\\w+)\\s*\\)\\s*{([\\s\\S]+?)}')
}

function getFirstBracketRegex(scopeType, openBracket){
	return new RegExp('\\s*' + scopeType + '\\s*\\(\\s*([\\w ,\\-]*)\\s*\\)\\s*' + openBracket + '\\s*', 'm');
}

function getFirstBracketRegexAnyScope(openBracket){
	return new RegExp('\\s*([\\w\\.]+)\\s*\\(\\s*(\\w*)\\s*\\)\\s*' + openBracket + '\\s*', 'm');
}

function get1DTableRegex(){
	return new RegExp('\\s*variable_1\\s*:\\s*([\\w\\.]+)\\s*;\\s*index_1\\s*\\(\\s*\\"([\\w\\"\\. ,\\(\\)\\+\\-\\*\\/!~\\d]+)\\s*\\"\\s*\\)\\s*;\\s*', 'm');
}

function get2DTableRegex(){
	return new RegExp('\\s*variable_1\\s*:\\s*([\\w\\.]+)\\s*;\\s*variable_2\\s*:\\s*([\\w\\.]+)\\s*;\\s*index_1\\s*\\(\\s*\\"([\\w\\"\\. ,\\(\\)\\+\\-\\*\\/!~\\d]+)\\s*\\"\\s*\\)\\s*;\\s*index_2\\s*\\(\\s*\\"([\\w\\"\\. ,\\(\\)\\+\\-\\*\\/!~\\d]+)\\s*\\"\\s*\\)\\s*;\\s*', 'm')
}

function getGateSizeRegex(){
	return new RegExp('^\\s*(\\w+\\d+)(\\w)(\\d+)\\s*$');
}

function getGateSizeRegexNoX(){
	return new RegExp('^\\s*(\\w+)(\\d+)\\s*$');
}

/****End Regular Expressions Generators****/

var Table = function(var1, var1Data, var2, var2Data){ //Data table constructor.
	var extractAxisValues = function(varData){
		if (getQuotedRegex().test(varData))
				varData = getQuotedRegex().exec(varData)[1];
		var stringData = varData.trim().split(',');
		var floatData = [];
		for(var i = 0; i < stringData.length; i++){
			var floatValue = parseFloat(stringData[i]);
			if(floatValue == NaN)
				console.log('Cannot parse ' + stringData[i]);
			else
				floatData.push(floatValue);
		}
		return floatData;
	}

	var getMinimum = function(arr){
		if(arr.length > 0){
			var min = arr[0];
			for(var i = 1; i < arr.length; i++)
				if(arr[i] < min)
					min = arr[i];
			return min;
		}
		return null;
	}

	var getMaximum = function(arr){
		if(arr.length > 0){
			var max = arr[0];
			for(var i = 1; i < arr.length; i++)
				if(arr[i] > max)
					max = arr[i];
			return max;
		}
		return null;
	}

	this.y_axis = var1;
	this.y_values = extractAxisValues(var1Data);
	this.min_y = getMinimum(this.y_values);
	this.max_y = getMaximum(this.y_values);

	this.table = {};
	this.points = [];
	this.targets = [];

	for(var i = 0; i < this.y_values.length; i++){
		this.table[this.y_values[i]] = 0;		
	}

	

	if(typeof var2 !== 'undefined' && typeof var2Data !== 'undefined'){
		this.dim = 2;
		this.x_axis = var2;
		this.x_values = extractAxisValues(var2Data);
		this.min_x = getMinimum(this.x_values);
		this.max_x = getMaximum(this.x_values);

		for(var i = 0; i < this.y_values.length; i++){
			this.table[this.y_values[i]] = {};
			for(var j = 0; j < this.x_values.length; j++)
				this.table[this.y_values[i]][this.x_values[j]] = 0;		
		}

		this.setData = function(row, column, value){

			if(typeof row === 'string')
				row = parseFloat(row);
			if (typeof column === 'string')
				column = parseFloat(column);
			if (typeof value === 'string')
				value = parseFloat(value);

			if(typeof this.table[row] === 'undefined' || typeof this.table[row][column] === 'undefined'){
				console.log('No axis value!');
			}else{
				this.table[row][column] = value;
				var point = [row, column];
				if (this.points.indexOf(point) === -1){
					this.points.push(point);
					this.targets.push(value);
				}
			}
		}
		this.getData = function(row, column){

			if(typeof(row) === 'string')
				row = parseFloat(row);

			if (typeof(column) === 'string')
				column = parseFloat(column);

			var tps = new TPS();

			tps.compile(this.points, this.targets);

			var targetPoint = [row, column];
			return tps.getValues([targetPoint]).ys[0];
		};

	}else{
		this.dim = 1;
		this.setData = function(column, value){
			if (typeof column === 'string')
				column = parseFloat(column);
			if (typeof value === 'string')
				value = parseFloat(value);

			if(typeof this.table[column] === 'undefined'){
				console.log('No axis value!');
			}else{
				this.table[column] = value;

				var point = [column];
				if (this.points.indexOf(point) === -1){
					this.points.push(point);
					this.targets.push(value);
				}

			}
		}

		this.getData = function(column){

			if (typeof(column) === 'string')
				column = parseFloat(column);

			var tps = new TPS();

			tps.compile(this.points, this.targets);

			var targetPoint = [column];

			return tps.getValues([targetPoint]).ys[0];
		}

	}

};

module.exports.Table = Table;

function extractAttributes(data){ //Extracting simple object attributes.
	var result = {};
	var attrRegex = getAllAttributesRegex();
	var matchGroups = attrRegex.exec(data);
	while(matchGroups != null){
		var value = matchGroups[3];
		if (getNumberRegex().test(value))
			result[matchGroups[2]] = parseFloat(value);
		else if (getQuotedRegex().test(value))
			result[matchGroups[2]] = getQuotedRegex().exec(value)[1];
		else
			result[matchGroups[2]] = value
		matchGroups = attrRegex.exec(data);
	}

	return result;
}

function extractScope(data, scopeName, openBracket, closeBracket){ //Extracting scope content.

	if(typeof openBracket === 'undefined')
		openBracket = '{';
	if(typeof closeBracket === 'undefined')
		closeBracket = '}';

	var bracketRegex = getFirstBracketRegex(scopeName, openBracket);
	var result = {
		found: false,
		slicedData: data,
		scopeParams: null,
		content: null
	}

	if (bracketRegex.test(data)){
		var matchGroups = bracketRegex.exec(data);
		var expressionLength = matchGroups[0].length;

		result.found = true;
		result.scopeParams = matchGroups[1];

		var startPos = data.search(bracketRegex) + expressionLength;
		var searchPos = startPos;
		var bracketsCount = 1;

		while(bracketsCount > 0 && searchPos < data.length){
			if(data.charAt(searchPos) == openBracket)
				bracketsCount++;
			else if (data.charAt(searchPos) == closeBracket)
				bracketsCount--;
			searchPos++;
		}
		if(bracketsCount != 0){
			console.log('Unmatched bracket');
			result.found = false;
			return result;
		}else{
			var extracted = data.substr(startPos, searchPos - startPos - 1).trim();
			result.content = extracted;
			result.slicedData = (data.slice(0, startPos - expressionLength) + data.slice(searchPos)).trim();
			return result;
		}
	}

	return result;
}

function extractAnyScope(data, openBracket, closeBracket){ //Extracting scope content.

	if(typeof openBracket === 'undefined')
		openBracket = '{';
	if(typeof closeBracket === 'undefined')
		closeBracket = '}';

	var bracketRegex = getFirstBracketRegexAnyScope(openBracket);
	var result = {
		found: false,
		slicedData: data,
		scopeName: null,
		scopeParams: null,
		content: null
	}

	if (bracketRegex.test(data)){
		var matchGroups = bracketRegex.exec(data);
		var expressionLength = matchGroups[0].length;

		result.found = true;
		result.scopeName = matchGroups[1];
		result.scopeParams = matchGroups[2];

		var startPos = data.search(bracketRegex) + expressionLength;
		var searchPos = startPos;
		var bracketsCount = 1;

		while(bracketsCount > 0 && searchPos < data.length){
			if(data.charAt(searchPos) == openBracket)
				bracketsCount++;
			else if (data.charAt(searchPos) == closeBracket)
				bracketsCount--;
			searchPos++;
		}
		if(bracketsCount != 0){
			console.log('Unmatched bracket');
			result.found = false;
			return result;
		}else{
			var extracted = data.substr(startPos, searchPos - startPos - 1).trim();
			result.content = extracted;
			result.slicedData = (data.slice(0, startPos - expressionLength) + data.slice(searchPos)).trim();
			return result;
		}
	}

	return result;
}

function extractTemplates(data){ //Extracting table templates.
	var result = {templates: {}};
	var luTableTemplateScope = {};
	var powerLutTemplateScope = {};
	while((luTableTemplateScope = extractScope(data, 'lu_table_template')).found){
		var scopeContent = luTableTemplateScope.content;
		var tableRegex1D = get1DTableRegex();
		var tableRegex2D = get2DTableRegex();
		if(tableRegex1D.test(scopeContent)){
			var matchGroups = tableRegex1D.exec(scopeContent);
			var table1D = new Table(matchGroups[1].trim(), matchGroups[2].trim());
			table1D.type = 'lu_table_template';
			result.templates[luTableTemplateScope.scopeParams] = table1D;
		}else if (tableRegex2D.test(scopeContent)){
			var matchGroups = tableRegex2D.exec(scopeContent);
			var table2D = new Table(matchGroups[1].trim(), matchGroups[3].trim(), matchGroups[2].trim(), matchGroups[4].trim());
			table2D.type = 'lu_table_template';
			result.templates[luTableTemplateScope.scopeParams] = table2D;
		}else
			console.log('Invalid table ' + scopeContent);

		data = luTableTemplateScope.slicedData;
	}

	while((powerLutTemplateScope = extractScope(data, 'power_lut_template')).found){
		var scopeContent = powerLutTemplateScope.content;
		var tableRegex1D = get1DTableRegex();
		var tableRegex2D = get2DTableRegex();
		if(tableRegex1D.test(scopeContent)){
			var matchGroups = tableRegex1D.exec(scopeContent);
			var table1D = new Table(matchGroups[1].trim(), matchGroups[2].trim());
			table1D.type = 'power_lut_template';
			result.templates[powerLutTemplateScope.scopeParams] = table1D;
		}else if (tableRegex2D.test(scopeContent)){
			var matchGroups = tableRegex2D.exec(scopeContent);
			var table2D = new Table(matchGroups[1].trim(), matchGroups[3].trim(), matchGroups[2].trim(), matchGroups[4].trim());
			table2D.type = 'power_lut_template';
			result.templates[powerLutTemplateScope.scopeParams] = table2D;
		}else
			console.log('Invalid table ' + scopeContent);

		data = powerLutTemplateScope.slicedData;
	}

	result.slicedData = data.trim();
	return result;
}

function parseTableObject(data, templates){
	var result = {};

	var newScope = {};
	while((newScope = extractAnyScope(data)).found){
		var templateName = newScope.scopeParams
		var template = templates[templateName];
		var tableDef = newScope.content;
		var timingTable;
		var index1Data = getOpeartionRegex('index_1').exec(tableDef)[1];
		var values = getOpeartionRegex('values').exec(tableDef)[1];
		values = values.replace(/[\\\s]+/gm, '');
		if(template.dim == 2){		
			var index2Data = getOpeartionRegex('index_2').exec(tableDef)[1];		
			timingTable = new Table(template.y_axis, index1Data, template.x_axis, index2Data);
			
			var rowKeys = timingTable.y_values;

			var valuesRowsString = []; 
			var quoteRegex = getQuotationsRegex();
			var matchedQuote = quoteRegex.exec(values);
			while(matchedQuote != null){
				valuesRowsString.push(matchedQuote[1]);
				matchedQuote = quoteRegex.exec(values);
			}

			if (rowKeys.length != valuesRowsString.length)
				console.log('Parsing (rows) error!');

			for(var i = 0; i < rowKeys.length; i++){
				var columnKeys = timingTable.x_values;
				var stringValues = valuesRowsString[i].trim().split(',');

				if (stringValues.length != columnKeys.length)
					console.log('Parsing (columns) error!');

				for(var j = 0; j < columnKeys.length; j++){
					var floatValue = parseFloat(stringValues[j].trim());
					if (floatValue === NaN){
						console.log('Cannot parse ' + stringValues[j].trim());
					}else
						timingTable.setData(rowKeys[i], columnKeys[j], floatValue);
				}

			}
			
		}else{
			timingTable = new Table(template.y_axis, index1Data);

			var valuesRowsString = []; 
			var quoteRegex = getQuotationsRegex();
			var matchedQuote = quoteRegex.exec(values);
			while(matchedQuote != null){
				valuesRowsString.push(matchedQuote[1]);
				matchedQuote = quoteRegex.exec(values);
			}

			if (valuesRowsString.length != 1)
				console.log('Parsing (row) error!');

			var rowKeys = timingTable.y_values;

			var stringValues = valuesRowsString[0].trim().split(',');

			if (stringValues.length != rowKeys.length)
				console.log('Parsing (columns) error!');

			for(var i = 0; i < rowKeys.length; i++){
				var floatValue = parseFloat(stringValues[i].trim());
				if (floatValue === NaN){
					console.log('Cannot parse ' + stringValues[i].trim());
				}else
					timingTable.setData(rowKeys[i], floatValue);
			}

		}
		timingTable.template_name = templateName;
		result[newScope.scopeName] = timingTable;
		data = newScope.slicedData.trim();
	}

	var timingAttrs = extractAttributes(data);
	for(var key in timingAttrs)
		result[key] = timingAttrs[key];


	return result;
}


function parseCell(cellDefinition, templates){
	var newCell = {};


	var ffScope = {};
	if ((ffScope = extractScope(cellDefinition, 'ff')).found){
		var ffDefintion = ffScope.content;
		newCell.is_ff = true;
		newCell.ff = {};
		var funcs = ffScope.scopeParams.trim().split(',');
		for(var i = 0; i < funcs.length; i++)
			newCell.ff['function_' + i] = funcs[i].trim();
		var ffAttrs = extractAttributes(ffDefintion);
		for(var key in ffAttrs)
			newCell.ff[key] = ffAttrs[key];
		cellDefinition = ffScope.slicedData.trim();
	}else
		newCell.is_ff = false;

	var latchScope = {};
	if ((latchScope = extractScope(cellDefinition, 'latch')).found){
		var latchDefintion = latchScope.content;
		newCell.is_latch = true;
		newCell.latch = {};
		var funcs = latchScope.scopeParams.trim().split(',');
		for(var i = 0; i < funcs.length; i++)
			newCell.latch['function_' + i] = funcs[i].trim();
		var latchAttrs = extractAttributes(latchDefintion);
		for(var key in latchAttrs)
			newCell.latch[key] = latchAttrs[key];
		cellDefinition = latchScope.slicedData.trim();
	}else
		newCell.is_latch = false;

	var pinScope = {};
	while((pinScope = extractScope(cellDefinition, 'pin')).found){
		if(typeof newCell['pins'] === 'undefined')
			newCell['pins'] = {};
		var pinDef = pinScope.content;
		var pinName = pinScope.scopeParams;
		newCell.pins[pinName] = {name: pinName};

		

		var timingScope = {};

		while((timingScope = extractScope(pinDef, 'timing')).found){
			if(typeof newCell.pins[pinName].timing === 'undefined')
				newCell.pins[pinName].timing = {};
			var timingContent = timingScope.content;
			var relatedPinRegex = getAttributeRegex('related_pin');
			var relatedPin = 'any';
			if(relatedPinRegex.test(timingContent)){
				relatedPin = relatedPinRegex.exec(timingContent)[1];
				if(getQuotedRegex().test(relatedPin))
					relatedPin = getQuotedRegex().exec(relatedPin)[1];
				timingContent = timingContent.replace(relatedPinRegex, '');
			}
				newCell.pins[pinName].timing[relatedPin] = parseTableObject(timingContent, templates);
				pinDef = timingScope.slicedData;
		}

		var powerScope = {};
		while((powerScope = extractScope(pinDef, 'internal_power')).found){
			if(typeof newCell.pins[pinName].internal_power === 'undefined')
				newCell.pins[pinName].internal_power = {};
			var powerContent = powerScope.content;
			var relatedPinRegex = getAttributeRegex('related_pin');
			var relatedPin = 'any';
			if(relatedPinRegex.test(powerContent)){
				relatedPin = relatedPinRegex.exec(powerContent)[1];
				if(getQuotedRegex().test(relatedPin))
					relatedPin = getQuotedRegex().exec(relatedPin)[1];
				powerContent = powerContent.replace(relatedPinRegex, '');
			}
			newCell.pins[pinName].internal_power[relatedPin] = parseTableObject(powerContent, templates);
			pinDef = powerScope.slicedData;
					
		}
		var pinAttrs = extractAttributes(pinDef);
		for(var key in pinAttrs)
			newCell.pins[pinName][key] = pinAttrs[key];

		cellDefinition = pinScope.slicedData;
	}

	var generalAttrs = extractAttributes(cellDefinition);

	for(var key in generalAttrs)
		newCell[key] = generalAttrs[key];

	return newCell;
}

function extractCells(data, templates){
	var result = {cells: {}};
	var cellScope = {};
	while((cellScope = extractScope(data, 'cell')).found){
		var cellDefinition = cellScope.content;
		var cellName = cellScope.scopeParams;
		result.cells[cellName] = parseCell(cellDefinition, templates);
		result.cells[cellName].name = cellName;
		var gateSizeRegex = getGateSizeRegex();
		var gateSizeRegexNoX = getGateSizeRegexNoX();

		if(gateSizeRegex.test(cellName)){
			var matchGroups = gateSizeRegex.exec(cellName);
			var cellSize = parseInt(matchGroups[3]);
			result.cells[cellName].basename = matchGroups[1];
			result.cells[cellName].basenameX = matchGroups[1] + matchGroups[2];
			result.cells[cellName].size = cellSize;
		}else if (gateSizeRegexNoX.test(cellName)){
			var matchGroups = gateSizeRegexNoX.exec(cellName);
			var cellSize = parseInt(matchGroups[2]);
			result.cells[cellName].basename = matchGroups[1];
			result.cells[cellName].basenameX = matchGroups[1];
			result.cells[cellName].size = cellSize;
		}else{
			result.cells[cellName].basename = cellName;
			var cellSize = 1;
			result.cells[cellName].size = cellSize;
		}

		data = cellScope.slicedData;
	}

	result.slicedData = data.trim();
	return result;
}

module.exports.parse = function(content, callback){
	var commentRegex = /\/\/.*$/gm; //RegEx: Capturing comments RegEx.
	var mCommentRegex = /\/\*(.|[\r\n])*?\*\//gm; //RegEx: Capturing multi-line comments RegEx.
	content = content.replace(mCommentRegex, ''); //Removing multi-line comments.
	content = content.replace(commentRegex, ''); //Removing single line comments.

	if(!getLibraryRegex().test(content))
		return callback('Invalid liberty file', null);
	var nameAndData = getLibraryRegex().exec(content);

	var library = {}; //Final Standard Cell Library Object.
	library.name = nameAndData[1];
	content = nameAndData[2];


	/*****Parsing capacitive load unit*****/
	var capacitiveLoadUnitRegex = getFunctionRegex('capacitive_load_unit');

	if(capacitiveLoadUnitRegex.test(content)){
		var extracted = capacitiveLoadUnitRegex.exec(content);
		library.capacitive_load_unit = {};
		library['capacitive_load_unit'].value = parseFloat(extracted[1]);
		library['capacitive_load_unit'].unit = extracted[2];
		content = content.replace(getFunctionRegex('capacitive_load_unit'), '');
	}

	var attrsRegexs = { //Attributes regular expressions.
		delay_model: getAttributeRegex('delay_model'),
		in_place_swap_mode: getAttributeRegex('in_place_swap_mode'),
		time_unit: getAttributeRegex('time_unit'),
		voltage_unit: getAttributeRegex('voltage_unit'),
		pulling_resistance_unit: getAttributeRegex('pulling_resistance_unit'),
		leakage_power_unit: getAttributeRegex('leakage_power_unit'),
		current_unit: getAttributeRegex('current_unit'),
		slew_upper_threshold_pct_rise: getAttributeRegex('slew_upper_threshold_pct_rise'),
		slew_lower_threshold_pct_rise: getAttributeRegex('slew_lower_threshold_pct_rise'),
		slew_upper_threshold_pct_fall: getAttributeRegex('slew_upper_threshold_pct_fall'),
		slew_lower_threshold_pct_fall: getAttributeRegex('slew_lower_threshold_pct_fall'),
		input_threshold_pct_rise: getAttributeRegex('input_threshold_pct_rise'),
		input_threshold_pct_fall: getAttributeRegex('input_threshold_pct_fall'),
		output_threshold_pct_rise: getAttributeRegex('output_threshold_pct_rise'),
		output_threshold_pct_fall: getAttributeRegex('output_threshold_pct_fall'),
		nom_process: getAttributeRegex('nom_process'),
		nom_voltage: getAttributeRegex('nom_voltage'),
		nom_temperature: getAttributeRegex('nom_temperature'),
		default_operating_conditions: getAttributeRegex('default_operating_conditions')
	};


	/*****Parsing general attributes*****/
	for(var key in attrsRegexs){ 
		if(attrsRegexs[key].test(content)){
			var extracted = attrsRegexs[key].exec(content)[1];
			content = content.replace(attrsRegexs[key], '');
			if (getNumberRegex().test(extracted))
				library[key] = parseFloat(extracted);
			else if (getQuotedRegex().test(extracted))
				library[key] = getQuotedRegex().exec(extracted)[1];
			else
				library[key] = extracted
		}
	}


	/*****Parsing operating conditions*****/
	library.operating_conditions = {};
	var operatingConditionsScope;
	while((operatingConditionsScope = extractScope(content, 'operating_conditions')).found){
		library.operating_conditions[operatingConditionsScope.scopeParams] = extractAttributes(operatingConditionsScope.content);
		content = operatingConditionsScope.slicedData;
	}

	/****Parsing tables templates****/
	var extractedTemplates = extractTemplates(content);
	content = extractedTemplates.slicedData;
	library.templates = extractedTemplates.templates;

	/****Parsing cells****/
	var extractedCells = extractCells(content, library.templates);
	content = extractedCells.slicedData;
	library.cells = extractedCells.cells;
	library.cells['input'] = { pins: {'A': {name: 'A', direction: 'input'}, 'Y': {name: 'Y', direction: 'output'}}, is_ff: false, is_latch: false, is_dummy: false, is_input: true, is_output: false, is_vdd: false, is_gnd: false};
	library.cells['output'] = { pins: {'A': {name: 'A', direction: 'input'}, 'Y': {name: 'Y', direction: 'output'}}, is_ff: false, is_latch: false, is_dummy: false, is_input: false, is_output: true, is_vdd: false, is_gnd: false};
	library.cells['vdd'] = { pins: {'A': {name: 'A', direction: 'input'}, 'Y': {name: 'Y', direction: 'output'}}, is_ff: false, is_latch: false, is_dummy: true, is_input: true, is_output: false, is_vdd: true, is_gnd: false};
	library.cells['gnd'] = { pins: {'A': {name: 'A', direction: 'input'}, 'Y': {name: 'Y', direction: 'output'}}, is_ff: false, is_latch: false, is_dummy: true, is_input: true, is_output: false, is_vdd: false, is_gnd: true};
	

	library.sizing = {};

	for(var key in library.cells){
		var cellBaseName = library.cells[key].basenameX;
		var cellSize = library.cells[key].size;
		if(typeof library.sizing[cellBaseName] === 'undefined')
			library.sizing[cellBaseName] = {};
		library.sizing[cellBaseName][cellSize] = library.cells[key];
	}

	for(var key in library.cells){
		var cellBaseName = library.cells[key].basenameX;
		if(typeof library.cells[key].available_sizes === 'undefined')
			library.cells[key].available_sizes = [];
		for (var sizeKey in library.sizing[cellBaseName])
			if(library.cells[key].available_sizes.indexOf(sizeKey) == -1)
				library.cells[key].available_sizes.push(parseInt(sizeKey));
	}

	callback(null, library);
}

