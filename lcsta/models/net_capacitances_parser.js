'use strict';

module.exports.parse = function(data, callback){
	var parsed;
	try {
        parsed = JSON.parse(data);
    } catch (e) {
    	console.log(e);
        return callback('Invalid net capacitances file', null);
    }
    
	callback(null, parsed);
}