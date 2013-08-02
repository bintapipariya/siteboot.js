
var server = {}; 

exports.init = function(x){
	server = x; 
}

exports.new = function(x){
	return new Widget(x); 
}

var Widget = function(x){
	this.server = x; 
	this.model = {id: "text_widget"}; 
	this.widgets = {}; 
}

Widget.prototype.data = function(data){
	if(data){
		this.model = data; 
		this.widgets["title"] = this.server.get_widget_or_empty("editable_content").new(this.server).data({id: data.id+"_title"}); 
		this.widgets["content"] = this.server.get_widget_or_empty("editable_content").new(this.server).data({id: data.id+"_content"}); 
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

exports.render = function(path, args, session, done){
	done("Deprecated function!"); 
}

