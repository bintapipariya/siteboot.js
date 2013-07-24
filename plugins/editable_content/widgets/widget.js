var server = {}


exports.init = function(x){
	server = x; 
}

var JSON = require("JSON"); 

exports.render = function(path, args, session, callback){
	var id = path; 
	console.log("ARGS: "+JSON.stringify(args)); 
	if("widget_arg" in args && args["widget_arg"]){
		id = args["widget_id"];
	}
	var html = session.render("editable_content_widget", {
		object_id: id, 
		content: "none",
	}); 
	callback(html); 
}
