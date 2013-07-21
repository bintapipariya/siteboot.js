var server = {};
exports.init = function(ctx){
	server = ctx; 
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
