var server = {}
var $ = require("jquery"); 

var Widget; 

exports.init = function(x){
	server = x; 
	return Widget; 
}

exports.new = function(x){
	return new Widget(x); 
}

exports.render = function(path, args, session, callback){
	callback("Deprecated method!"); 
}

Widget = function(x){
	this.server = x; 
	this.model = {
		id: "default", // default id
		content: "Default content",
	}
}
Widget.prototype.render = function(path, args, session, callback){
	var widget = this; 
	
	widget.server.properties.get("editable_content", widget.model.id, "content", function(err, value){
		if(!err) {
			widget.model.content = value;
		}
		var html = session.render("editable_content", {
			model: widget.model
		}); 
		callback(html); 
	}); 
}

Widget.prototype.data = function(data){
	if(data){
		this.model = data; 
	} else {
		return this.model; 
	}
}
