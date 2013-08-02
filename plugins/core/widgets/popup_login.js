
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

Widget.prototype.render = function(path, args, session, done){
	var html = session.render("core_popup_login", {
		login_link: (session.user.loggedin)?"/user?logout=1":"#",
		login_text: (session.user.loggedin)?"Log out":"Log in",
		login_info: (session.user.loggedin)?"Welcome "+session.user.username+"! ":"Not logged in",
	});
	done(html); 
}

exports.render = function(path, args, session, done){
	done("Deprecated function!"); 
}

