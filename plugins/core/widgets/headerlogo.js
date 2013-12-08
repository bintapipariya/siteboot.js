var server = {}; 


var Widget = function(x){
	this.server = x; 
}

Widget.prototype.render = function(req){
	return this.server.render("core_headerlogo", {
		image: "/logo.png",
		link: "/"
	}); 
}


exports.module = {
	type: Widget
}
