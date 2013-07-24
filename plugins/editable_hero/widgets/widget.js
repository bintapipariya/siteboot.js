var server = {}


exports.init = function(x){
	server = x; 
}

exports.render = function(path, args, session, callback){
	var html = session.render("editable_hero_widget", {
		object_id: args["widget_id"]
	}); 
	callback(html); 
}
