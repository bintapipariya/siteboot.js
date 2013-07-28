var JSON = require("JSON"); 


var Widget = function(x){
	this.server = x; 
	this.model = {
		id: "editable_hero",
		content: "Default content"
	}; 
}

exports.init = function(){}
exports.widget = {
	name: "Editable Hero Widget"
}; 

exports.new = function(x){
	return new Widget(x); 
}

Widget.prototype.data = function(data){
	if(data)
		this.model = data; 
	else return this.model; 
}

Widget.prototype.render = function(path, args, session, callback){
	var wildcard = "/editable/hero_bg_"+this.model.id+"*";
	var public_image_path = "/editable/hero_bg_default.jpg";
	var widget = this; 
	
	// retreive the widget text and render the widget
	this.server.db.properties.get("editable_hero", "editable_hero"+widget.model.id, "content", function(error, value){
		widget.model.content = value; 
		widget.model.editable = session.user.loggedin; 
		
		widget.server.vfs.search(wildcard, function(error, files) {
			if(!error && files.length){
				public_image_path = files[0]; 
			}
			var html = session.render("editable_hero_widget", {
				model: widget.model,
				background: public_image_path,
			}); 
			callback(html); 
		}); 
	}); 
	
}

exports.render = function(path, args, session, callback){
	callback("Deprecated callback!"); 
}
