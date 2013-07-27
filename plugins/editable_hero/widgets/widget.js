var server = {}
var JSON = require("JSON"); 

exports.init = function(x){
	server = x; 
}

exports.render = function(path, args, session, callback){
	var wildcard = "/editable_hero/hero_bg_"+args["widget_id"]+"*";
	var public_image_path = "/editable_hero/default.jpg";
	//console.log("
	server.vfs.search(wildcard, function(error, files) {
		if(!error && files.length){
			public_image_path = files[0]; 
		}
		var html = session.render("editable_hero_widget", {
			object_id: args["widget_id"],
			background: public_image_path,
		}); 
		callback(html); 
	}); 
}
