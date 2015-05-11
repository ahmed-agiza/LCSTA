module.exports.parse = function(data, callback){
	var parsed;
	try {
        parsed = JSON.parse(data);
    } catch (e) {
    	console.log(e);
        return callback('Invalid timing constraints file', null);
    }
    
	callback(null, parsed);
}