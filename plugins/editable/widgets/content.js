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

Widget = function(x){
	this.server = x; 
	this.model = {
		id: "default", // default id
		content: "Default widget content",
		name: "content",
	}
}
Widget.prototype.render = function(req){
	var widget = this; 
	var args = req.args; 
	var session = req.session; 
	var path = req.path; 
	var result = this.server.defer(); 
	function done(x){result.resolve(x);}
	var self = this; 
	
	widget.server.db.objects.properties.find({
		where: {
			object_type: "editable_content", 
			object_id: widget.model.id, 
			property_name: widget.model.name||"content"
		}}).success(function(value){
		self.server.render("editable_content", {
			object_id: widget.model.id,
			property_name: widget.model.name||"content",
			content: (value)?value.property_value:"<p>Default editable content</p>"
		}).done(done); 
	}); 
	return result.promise; 
}

Widget.prototype.data = function(data){
	if(data){
		for(var key in data) this.model[key] = data[key]; 
		return this; 
	} else {
		return this.model; 
	}
}
