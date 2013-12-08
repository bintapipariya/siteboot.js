
var server = {}; 

var Widget = function(x){
	this.server = x; 
	this.model = {id: "text_widget"}; 
	this.widgets = {}; 
}

Widget.prototype.data = function(data){
	if(data){
		this.model = data; 
		this.widgets["title"] = this.server.create_widget("editable_content").data({id: data.id+"_title"}); 
		this.widgets["content"] = this.server.create_widget("editable_content").data({id: data.id+"_content"}); 
		return this; 
	} else {
		return this.model; 
	}
}

Widget.prototype.render = function(path, args, session, done){
	session.render_widgets(this.widgets, path, args, function(data){
		var html = session.render("core_sidebar_text_widget", data); 
		done(html); 
	}); 
}


exports.module = {
	type: Widget
}
