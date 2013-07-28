var async = require("async"); 
var walk = require("walk"); 
var fs = require("fs"); 

var index = {}; 

exports.search = function(wildcard, callback){
	var rx = RegExp(wildcard.replace("*", ".*?"), "gi"); 
	var keys = Object.keys(index); 
	
	// fast asynchronous filter
	async.filter(keys, function(key, callback){
		var match = rx.test(key); 
		if(match){
			console.log("Found matching file "+key+" for "+wildcard); 
		}
		callback(match);
	}, function(results){
		callback(undefined, results); 
	});
}
	
exports.add_index = function(dir, callback){
	console.log("Indexing directory "+dir); 
	var addtoindex = function(root, stat, next){
		var realpath = root+"/"+stat.name; 
		var path = root.substr(dir.length)+"/"+stat.name;
		console.log("Adding link "+path+" -> "+realpath); 
		index[path] = realpath; 
		next(); 
	}
	walk.walk(dir)
	.on("file", addtoindex)
	.on("directory", addtoindex)
	.on("end", function(){
		if(callback) callback(); 
	}); 
}

exports.resolve = function(path, callback){
	if(path in index){
		if(fs.existsSync(index[path])){
			done(undefined, index[path]); 
			return index[path]; 
		}
		else {
			done("File does not exist! ("+path+")"); 
			delete index[path]; 
			return undefined; 
		}
	} else {
		done( "File does not exist: "+path); 
		
		return undefined; 
	}
	function done(err){
		if(callback) callback(err);
	}
}
