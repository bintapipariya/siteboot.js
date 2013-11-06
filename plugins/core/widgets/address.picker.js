var http = require("http"); 
var async = require("async"); 
var JSON = require("JSON"); 
var exec = require("child_process").exec; 

var curl = function(url, cb){
	url = url.replace(/\s+/g, "+"); 
	console.log("CURL: "+url); 
	exec("curl \""+url+"\"", function(err, res){
		if(err) console.log("CURLERROR: "+err);
		else console.log("CURLSUCCESS!"); 
		cb(err, res); 
	}); 
}

var server = {}; 

exports.session = {
	current_booking: {}
}

exports.init = function(x){
	server = x; 
}

exports.new = function(x){
	return new Widget(x); 
}

var Widget = function(x){
	this.server = x; 
}

Widget.prototype.post = function(req){
	var result = this.server.defer(); 
	result.resolve(); 
	return result.promise; 
}

Widget.prototype.resolveAddress = function(addr, next){
	if(!addr){
		next("You must specify an address to resolve!"); 
		return; 
	}
	
	curl("http://maps.googleapis.com/maps/api/geocode/json?sensor=true&address="+addr, 
	function(err, res){
		if(!res){
			next("Could not resolve address!"); 
			return; 
		}
		try {
			var to = JSON.parse(res); 
			var addr = ""; 
			
			if(to.status != "OK")
				next("Could not resolve address!"); 
				
			if(to.results.length) 
				addr = to.results[0].formatted_address; 
				
			next(null, addr); 
		} catch(e){
			next(e); 
		}
	}); 
}

Widget.prototype.render = function(req){
	var self = this; 
	var args = req.args; 
	var session = req.session; 
	var path = req.path; 
	var result = this.server.defer(); 
	function done(x){result.resolve(x);}
	
	if("resolve" in args){
		self.resolveAddress(args["address"], function(err, address){
			if(err){
				done(JSON.stringify({
					status: "ERROR", 
					error: err
				}));
			} else {
				done(JSON.stringify({
					status: "OK", 
					address: address
				})); 
			}
		}); 
	} else {
		return self.server.render("core_address.picker", {
			widget_id: this.id,
			name: self.data().name, 
			data: session.current_booking
		}); 
	}
	return result.promise; 
}

