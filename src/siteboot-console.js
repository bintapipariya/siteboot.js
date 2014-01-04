Server(function(){
	Server.prototype.console = {
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
}); 
