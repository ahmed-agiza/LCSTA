var Cell = require('./cell').cell;
var Connect = require('./cell').connect;
var TemplateCell = require('./cell').templateCell;


function getAttributeRegex(attr){
	return new RegExp('\\s*' + attr + '\\s*:\\s*(.+)\\s*;\\s*', 'm');
}

function getLibraryRegex(){
	return new RegExp('library\\s*\\(\\s*(.*)\\s*\\)\\s*{([^]+)}', 'm')
}

function getBracketRegex(){
	return new RegExp('{([^]+)}');
}

function getNumberRegex(){
	return new RegExp('^\\s*(\\d+(\\.\\d+)?\\s*)$');
}

module.exports.parse = function(content, callback){
	var commentRegex = /\/\/.*$/gm; //RegEx: Capturing comments RegEx.
	var mCommentRegex = /\/\*(.|[\r\n])*?\*\//gm; //RegEx: Capturing multi-line comments RegEx.
	content = content.replace(mCommentRegex, ''); //Removing multi-line comments.
	content = content.replace(commentRegex, ''); //Removing single line comments.

	if(!getLibraryRegex().test(content))
		return callback('Invalid liberty file', null);
	var nameAndData = getLibraryRegex().exec(content);
	var library = {}; //Standard Cell Library Object.
	library.name = nameAndData[1];

	var attrsRegexs ={
		delay_model: getAttributeRegex('delay_model'),
		in_place_swap_mode: getAttributeRegex('in_place_swap_mode'),
		time_unit: getAttributeRegex('time_unit'),
		voltage_unit: getAttributeRegex('voltage_unit'),
		pulling_resistance_unit: getAttributeRegex('pulling_resistance_unit'),
		leakage_power_unit: getAttributeRegex('leakage_power_unit'),
		capacitive_load_unit: getAttributeRegex('capacitive_load_unit'),
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
		nom_temperature:getAttributeRegex('nom_temperature'),
	};

	for(key in attrsRegexs){
		if(attrsRegexs[key].test(content)){
			var extracted = attrsRegexs[key].exec(content)[1];
			if (getNumberRegex().test(extracted))
				library[key] = parseInt(extracted);
			else
				library[key] = extracted
		}
	}
	

	console.log(library);

	callback(null, '');
}