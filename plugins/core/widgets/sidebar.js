
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
		var w = self.server.create_widget(widgets[i].type); 
		if("data" in w) w.data(widgets[i].data); 
		else console.debug("No data method found in w.name"); 
		renderlist.push(w); 
	}
	this.render_list = renderlist; 
	return this; 
}

Widget.prototype.render = function(req){
	// render all the widgets
	var widgets = this.render_list;  
	var self = this; 
	var result = this.server.defer(); 
	async.eachSeries(widgets, function(x, next){
		x.render(req).done(function(html){
			page += html; 
			next(); 
		}); 
	}, function(){
		result.resolve(page); 
	}); 
	return result.promise; 
}

exports.render = function(path, args, session, done){
	done("Deprecated function!"); 
}

