var server = {};
exports.init = function(ctx){
	server = ctx; 
	console.log("Initialized LiveSite bar!"); 
}

exports.render = function(path, args, session, done){
	var html = session.render("livebar", {
			content: "Hello World!"
	});
	done(html); 
}
