var server = {}
var async = require("async"); 

exports.init = function(x){
	server = x; 
}

exports.post = function(path, args, session, callback){
	if("save_seo_settings" in args && session.user.loggedin){
		var fields = ["title", "meta"]; 
		async.eachSeries(fields, function(x, cb){
			server.db.properties.set("page_content_control", args["object_id"], x, args[x], cb); 
		}, function(){
			callback(); 
		}); 
	} else {
		callback(); 
	}
}
