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
		content: "Default widget content",
		name: "content",
	}
}
Widget.prototype.render = function(path, args, session, callback){
	var widget = this; 

	widget.server.db.objects.properties.find({
		where: {
			object_type: "editable_content", 
			object_id: widget.model.id, 
			property_name: widget.model.name||"content"
		}}).success(function(value){
		if(value) {
			widget.model.content = value.property_value;
		} else {
			widget.model.content = "<p>Default widget model content</p>"; 
		}
		var html = session.render("editable_content", {
			model: widget.model
		}); 
		callback(html); 
	}); 
}

Widget.prototype.data = function(data){
	if(data){
		for(var key in data) this.model[key] = data[key]; 
		return this; 
	} else {
		return this.model; 
	}
}
