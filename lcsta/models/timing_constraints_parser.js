'use strict';

module.exports.parse = function(data, callback){
	var parsed;
	try {
        parsed = JSON.parse(data);
    } catch (e) {
    	console.log(e);
        return callback('Invalid timing constraints file', null);
    }

    if(!parsed.hasOwnProperty('clock'))
    	callback('The timing constraints file does not have the attribute "clock".', parsed);
    else    
		callback(null, parsed);
}