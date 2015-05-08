
module.exports.parse = function(data, callback){
	var parsed;
	try {
        parsed = JSON.parse(data);
    } catch (e) {
    	console.log(e);
        return callback('Invalid clock skews file', null);
    }
    
	callback(null, parsed);
}