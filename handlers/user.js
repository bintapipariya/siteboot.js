var server = {};
var crypto = require("crypto"); 

exports.init = function(ctx){
	server = ctx; 
	db = ctx.db;
	templates = ctx.templates; 
	
	exports.pages = ["/user"]; 
}

exports.post = function(path, args, session, callback){
	if("logout" in args){
		session.user = server.users.New(); 
		callback(); 
		return; 
	}
	if("login" in args){
		if(!("username" in args) || !("hash" in args)){
			callback("Error: you need to pass username=<username> and hash=<sha1(pass+sid)> to this script!"); 
			return; 
		}
		console.log("Attempting to login user "+args["username"]); 
		server.users.login({username: args["username"], hash: args["hash"]}, function(error, user){
			console.log("User "+args["username"]+" has successfully logged in!"); 
		}); 
	}
}

exports.render = function(path, args, session, done){
	if("logout" in args){
		var message = ""; 
		if(session.user.loggedin){
			session.user = server.users.New(); 
			message = "You have been logged out!";
		} else {
			message = "Not logged in!"; 
		}
		var html = session.render("root", {
			title: "User page",
			head: "",
			content: session.render("main_page", {
				content: 	message
			}), 
		});
		done(html); 
		return; 
	} else {
		var html = session.render("root", {
				title: "User details",
				head: "",
				content: session.render("main_page", {
					content: 	"user details"
				}), 
		});
		done(html); 
	}
}
