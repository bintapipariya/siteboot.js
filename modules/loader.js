var fs = require("fs"); 
var async = require("async"); 
var walk = require("walk"); 


function LoadScripts(dir, callback){
	if(!fs.existsSync(dir)) {
		callback({}); 
		return; 
	}
	fs.readdir(dir, function (err, files) {
		if (err) {
			console.log(err);
			callback({}); 
			return;
		}
		var scripts = {}; 
		for(var key in files){
			var file = files[key]; 
			if(!/\.js$/.test(file)) {
				continue;
			}
			try{
				var script_name = file.replace(/\.[^/.]+$/, "");
				var hr = require(dir+"/"+file);
				if(!("init" in hr)) continue; 
				hr.name = script_name; 
				//hr.init(server, function(){
				//	HandlerInitCompleted(hr); 
				//});
				//HandlerInitCompleted(hr); 
				//handlers[script_name] = hr; 
				scripts[script_name] = hr; 
				console.log("SCRIPT LOADED: "+script_name);
			}
			catch(e){
				console.log("ERROR: could not load script "+dir+"/"+file+": "+e+"\n"+e.stack); 
				process.exit(); 
			} 
		}
		callback(scripts);
	});
}

function LoadForms(basedir, callback){
	var walker = walk.walk(basedir); 
	var forms = {}; 
	
	walker.on("file", function(root, stat, next){
		if(!/\.html$/.test(stat.name)) {
			next(); 
			return;
		}
		
		try{
			var data = fs.readFileSync(root + "/" + stat.name); 
			var name = stat.name.replace(/\.[^/.]+$/, ""); 
			forms[name] = String(data); 
		}
		catch(e){
			console.log("ERROR: "+root+"/"+stat.name); 
		} 
		next(); 
	}).on("end", function(){
		callback(forms); 
	});
}

exports.LoadModule = function(path, callback){
	var module = {}; 
	if(fs.existsSync(path+"/init.js"))
		module = require(path+"/init"); 
		
	if(!("init" in module)){
		console.debug("Warning: no init in module "+path); 
	}
	
	async.series([
		function(callback){
			console.debug("Loading html forms from "+path+"/html"); 
			LoadForms(path+"/html", function(results){
				module.forms = {}; 
				for(var key in results){
					module.forms[key] = results[key]; 
				}
				callback(); 
			}); 
		},
		function(callback){
			console.log("Loading handlers from "+path+"/handlers");
			LoadScripts(path+"/handlers", function(scripts){
				module.handlers = {}; 
				for(var key in scripts){
					//hr.init(server);
					module.handlers[key] = scripts[key]; 
				}
				callback(); 
			});
		},
		function(callback){
			console.log("Loading widgets from "+path+"/widgets");
			LoadScripts(path+"/widgets", function(scripts){
				module.widgets = {}; 
				for(var key in scripts){
					module.widgets[key] = scripts[key]; 
					module.widgets[key].id = key; 
				}
				callback(); 
			});
		},
	], function(){
		callback(module); 
	});
}
