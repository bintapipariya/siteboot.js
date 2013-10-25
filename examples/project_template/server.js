var Site = function(){ 
	
}

Site.prototype.init = function(x, next){
	this.server = x; 
	// do some initialization here 
	//..
	
	// always call next
	next(); 
}
 
Site.prototype.render = function(path, args, session, next){
	// render calls the callback with everything the server eneds to render the page
	next({
		headers: {
			"Content-type": "text/html"
		},
		data: "<h3>Everything is working correctly!</h3><pre>Current path: /"+path+"\n</pre>"
	}); 
}

var sb = require("siteboot").init(new Site(), require("./config").config);
sb.boot(); 
