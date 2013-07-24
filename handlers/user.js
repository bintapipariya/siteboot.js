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
		server.users.get({username: args["username"]}, function(error, user){
			if(error){
				callback("Error: Wrong username or password!"); 
				console.log(error); 
				return; 
			}
			console.log("Login: user.hash: "+user.hash+", sid: "+session.sid); 
			if(args["hash"] == crypto.createHash("sha1").update(user.hash+session.sid).digest('hex')){
				console.log("Successfully logged in user: "+args["username"]);
				session.user = {
					username: user.username,
					role: user.role, 
					loggedin: true
				};  
				callback("Seccess: User logged in!"); 
				return; 
			}
			else {
				console.log("Error: could not login user "+args["username"]+": passwords do not match!"); 
				callback("Error: Wrong username or password!"); 
				return; 
			}
			callback("ok"); 
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
