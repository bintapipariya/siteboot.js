Server.console = function(){
	this._commands = {}; 
	var self = this; 
	
	this.console = {
		commands: {},
		exec: function(cmd, args){
			var ret = Q.defer(); 
			console.log("(null console): "+cmd+"("+args+") ");
			if(cmd in this.commands){
				this.commands[cmd].call(this, args).done(function(data){
					 ret.resolve(data); 
				}); 
			} else {
				ret.resolve({error: "Command "+cmd+" not found on the server!"}); 
			}
			return ret.promise; 
		}, 
		registerCommand: function(cmd, method){
			this.commands[cmd] = method; 
		}
	}
	
	return function(req, res, next){
		req.command = function(cmd, args){
			var user = (this.session.user)?this.session.user.username:"(guest)"; 
			console.log(user+" > "+cmd+" : "+args); 
			return self.console.exec(cmd, args); 
		}
		
		if(req.args["command"] && request.method == "POST"){
			req.args["argv"] = req.args["args[]"]||[]; 
			//console.log("ARGS: "+JSON.stringify(req.args["args[]"])
			//try { req.args["argv"] = JSON.parse(req.args["args[]"]); } catch(e){}
			if(Object.prototype.toString.call(req.args["argv"]) != "[object Array]"){
				console.error("Wrong type of object supplied as args array. Must be an array!"); 
				req.args["argv"] = []; 
			}
				
			res.writeHead(200, {
				"Content-Type": "application/json"
			}); 
			
			var command = req.args["command"]; 
			if(command in self._commands){
				console.log("COMMAND: "+command); 
				self._commands[command].method.call(this, req, res).done(function(){
					res.end(); 
				});  
			} else {
				console.error("Unknown command: "+command); 
				res.end(JSON.stringify({error: "Unknown command"})); 
			}
		} else {
			next(); 
		}
	}
}
