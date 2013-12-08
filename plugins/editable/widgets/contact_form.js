

var Widget = function(x){
	this.server = x; 
	this.model = {}; 
	this.widgets = {}; 
	this.widgets["title"] = x.create_widget("editable_content").data({id: "contact_form_default_title"}); 
	this.widgets["name"] = x.create_widget("editable_content").data({id: "contact_form_default_name"}); 
	this.widgets["phone"] = x.create_widget("editable_content").data({id: "contact_form_default_phone"}); 
	this.widgets["message"] = x.create_widget("editable_content").data({id: "contact_form_default_message"}); 
}

Widget.prototype.render = function(path, args, session, callback){
	var widget = this; 
	session.render_widgets(this.widgets, path, args, function(data){
		for(var key in data){
			widget.model[key] = data[key]; 
		}
		var html = session.render("editable_contact_form", widget.model); 
		callback(html); 
	}); 
}

Widget.prototype.data = function(data){
	if(data){
		this.model = data;
		this.widgets["title"].data({id: "contact_form_"+(data.id||"default")+"_title"}); 
		this.widgets["name"].data({id: "contact_form_"+(data.id||"default")+"_name"}); 
		this.widgets["message"].data({id: "contact_form_"+(data.id||"default")+"_message"}); 
		this.widgets["phone"].data({id: "contact_form_"+(data.id||"default")+"_phone"}); 
		return this; 
	} else {
		return this.model; 
	}
}

exports.module = {
	type: Widget
}
