$(document).ready(function(){
	var commands = {
		website: function(a, b){
			var ret = $.Deferred(); 
			this.echo("Command: "+a+"; "+b); 
			setTimeout(function(){
				ret.resolve(); 
			}, 1000); 
			return ret.promise(); 
		},
		reload: function(){
			var ret = $.Deferred(); 
			this.echo("Reloading..."); 
			window.location.reload(); 
			ret.resolve(); 
			return ret.promise(); 
		}
	}; 
	
	if($('.siteboot-terminal').length){
		var term = $('.siteboot-terminal').terminal(function(command, term){
			var cr = /^\s*([a-zA-Z0-9_]+)(.*?)$/; 
			var ar = /(["][^"]*["]|[^\s]*)/gi; 
			var cm = cr.exec(command); 
			var args = []; 
			var cmd = cm[1]; 
			if(cm.length > 1){
				args = cm[2].match(ar).filter(function(x){
					if(x == "") return false; 
					return true;
				}).map(function(x){
					return x.replace(/"/g, ""); 
				}); 
			}
			
			if(cmd in commands){
				term.pause(); 
				commands[cmd].apply(term, args).done(function(data){
					term.resume(); 
				}); 
			} else {
				// otherwise send the command to the server
				term.pause(); 
				$.post(window.location.path, {
					rcpt: "console", 
					command: cmd, 
					args: args
				}, function(data){
					term.resume(); 
					if(!data){
						term.error("Could not communicate with server!"); 
						return; 
					}
					try {
						data = JSON.parse(data); 
						if(data.error){
							term.error(data.error); 
						} else if(data.success){
							term.echo(data.success); 
						}
					} catch(e){
						term.error("Could not parse JSON!"); 
					}
				}); 
				
			}
		}, {
			greetings: 'Command console',
			name: 'command_console',
			height: 300,
			prompt: ((session.user)?session.user.username:"(guest)")+" > "
		});
		term.disable(); 
		X.console = {
			log: function(msg){
				this.term.echo(msg); 
			}
		}
		X.console.term = term; 
		
		var disabled = true; 
		$("body").on("keypress", function (e) {
				if(e.which == 167 && disabled){ // § key
					term.enable(); 
					$(".siteboot-terminal").slideDown();
					disabled = false; 
					return false;  
				} else if(e.which == 167 && !disabled){
					term.disable(); 
					$(".siteboot-terminal").slideUp(); 
					disabled = true; 
					return false; 
				}
		});
	}
});
