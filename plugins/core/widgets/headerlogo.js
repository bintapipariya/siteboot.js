var server = {}; 

exports.init = function(x){
	server = x; 
}

exports.new = function(x){
	return new Widget(x); 
}

var Widget = function(x){
	this.server = x; 
}

Widget.prototype.render = function(req){
	return this.server.render("core_headerlogo", {
		image: "/logo.png",
		link: "/"
	}); 
}

