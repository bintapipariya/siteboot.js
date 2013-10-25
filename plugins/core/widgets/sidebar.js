
var server = {}; 

exports.init = function(x){
	server = x; 
}

exports.new = function(x){
	return new Widget(x); 
}

var Widget = function(x){
	this.server = x; 
	this.render_list = []; 
}

Widget.prototype.data = function(data){
	var widgets = data.widgets; 
	var renderlist = []; 
	var self = this; 
	
	for(var i = 0; i < widgets.length; i++){
		console.debug("Creating new sidebar widget of type "+widgets[i].type); 
		var w = self.server.create_widget(widgets[i].type).data(widgets[i].data); 
		renderlist.push(w); 
	}
	this.render_list = renderlist; 
	return this; 
}

Widget.prototype.render = function(path, args, session, done){
	// render all the widgets
	var widgets = this.render_list;  
	var self = this; 
	session.render_widgets(widgets, path, args, function(data){
		var html = ""; 
		Object.keys(data).map(function(x){
			html += data[x]; 
		}); 
		done(html); 
	}); 
}

exports.render = function(path, args, session, done){
	done("Deprecated function!"); 
}

