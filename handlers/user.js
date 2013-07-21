var server = {};
exports.init = function(ctx){
	server = ctx; 
	db = ctx.db;
	templates = ctx.templates; 
	
	exports.pages = ["/user"]; 
}

exports.render = function(path, args, session, done){
	var html = session.render("root", {
			title: "User details",
			head: "",
			content: session.render("main_page", {
				content: 	"user details"
			}), 
	});
	done(html); 
}
