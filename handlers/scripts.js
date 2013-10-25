var async = require("async"); 
var fs = require("fs"); 
var walk = require("walk"); 

var server = {};
var scripts = ""; 

exports.init = function(ctx){
	server = ctx; 
	db = ctx.db;
	templates = ctx.templates; 
	exports.headers = {};
	exports.headers["Content-type"] = "text/javascript"; 
	exports.pages = ["/scripts"]; 
	
	console.log("Loading client side scripts.."); 
	function load_scripts_from_directory(dir, done){
		console.log("Loading scripts in "+dir); 
		fs.readdir(dir, function(err, files){
			if(files) files.sort(); 
			for(var key in files){
				var file = files[key]; 
				if(/\.js$/.test(file)){
					console.log("Loading client script "+dir+"/"+file); 
					scripts += fs.readFileSync(dir+"/"+file); 
				}
			}
			if(done) done();
		});
	}
	function load_scripts(subdir, done){
		var client_dirs = []; 
		walk.walk(server.basedir+"/"+subdir).on("directory", function(root, stat, next){
			if(/^client$/.test(stat.name)){
				(function(dir){
					client_dirs.push(root+"/"+stat.name); 
				})(root+"/"+stat.name); 
			}
			next(); 
		}).on("end", function(){
			async.each(client_dirs, function(dir, cb){
				console.log("Loading scripts for "+dir); 
				load_scripts_from_directory(dir, cb); 
			}, function(err){
				console.log("Done loading scripts for "+subdir); 
				done(); 
			}); 
		});
	}
	
	async.series([
		function(cb){
			load_scripts_from_directory(server.basedir+"/client", cb); 
		},
		function(cb){
			load_scripts_from_directory(server.config.site_path+"/client", cb); 
		},
		function(cb){
			load_scripts("plugins", cb);
		},
		function(cb){
			load_scripts("themes/"+server.config.theme, cb); 
		}
	], function(){
		
	}); 
	// search for scripts in the plugin directories and cache all of them into a single buffer. 
	
}

exports.render = function(path, args, session, done){
	// output relevant session variables to the browser 
	// (we don't want to output everything because some stuff is meant for the server only) 
	var session_string = ""; 
	try{
		session_string = JSON.stringify(session);
	} catch(e){
		console.error("Could not stringify session: "+e); 
	} 
	var sscripts = "var livesite_session = "+(session_string || "{}")+";\n\n";
	done(sscripts+scripts); 
}
