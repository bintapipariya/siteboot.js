var JSON = require("JSON"); 

var Widget = function(){
	
}

Widget.prototype.render = function(req){
	var ret = this.server.defer(); 
	var self = this; 
	
	self.server.render("contact.form", {
		rcpt: self.object.template,
		form_form: self.object.properties["contact_form_form"]
	}).done(function(html){
		ret.resolve(html); 
	}); 
	
	return ret.promise; 
}

exports.module = {
	type: Widget
}
