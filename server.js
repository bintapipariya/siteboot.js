/*********************************************

FORTMAX Node.js SERVER

For more projects, visit https://github.com/fantachip/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
**********************************************/

var Fortmax = function(){
var agent = require('webkit-devtools-agent');	
var http = require("http");
var https = require("https");
var fs = require("fs");
var url = require("url"); 
var path = require("path");
var JSON = require("JSON");
var walk = require("walk"); 
var mustache = require('mustache'); 
var crypto = require("crypto"); 
var querystring = require("querystring"); 
var formidable = require("formidable");
var mysql = require("mysql");
var async = require("async"); 
var multipart = require("multipart");
var sys = require("sys");

var cfg = require("./config");
var config = cfg.config; 

var server = {} 

var widgets = {}
var pages = {};
var forms = {}; 
var texts = {}; 
var handlers = {};
var plugins = {}; 
var core = {}; 

var current_theme = {}; 


var mime_types = {
	'.html': "text/html",
	'.css':  "text/css",
	'.js':   "text/javascript",
	'.jpg': "image/jpeg",
	'.jpeg': "image/jpeg",
	'.png': "image/png"
};

var BASEDIR = process.cwd()+"/"; 
var ITEMS_PER_PAGE = 21; 

var sessions = {}; 
var theme = {};

var db = require("./modules/db").connect(config.database, main); 
var vfs = require("./modules/vfs"); 
var loader = require("./modules/loader"); 

console.debug = function(msg){
	console.log("DEBUG: "+msg); 
}


function WidgetValue(widget, args, session){
	this.session = session; 
	this.widget = widget; 
	this.args = args; 
	
	var self = this; 
	
	return function(){
		return function(val){ // val is the argument from mustache
			var name = self.widget.id; 
			if(val){
				name = self.widget.id+"_"+val; 
			}
			console.log("Getting value for "+name+", "+val); 
			if(!(name in self.session.rendered_widgets)){
				var w = {};
				for(var key in self.widget)
					w[key] = self.widget[key];
				w.id = name; 
				w.argument = val; 
				widgets[name] = w; 
				console.log("Added copy widget for key "+name); 
				// call render for the widget
				//self.widget.render(docpath, self.args, self.session, function(html){
				//	session.rendered_widgets[name] = html; 
				//}); 
				return "Default Text"; 
			}
			return self.session.rendered_widgets[name];
		}
	};
}


function SessionRenderForm(template, session, args) {
	var params = {};
	// add all value retreivers for all currently available widgets
	for(var key in widgets){
		params[key] = new WidgetValue(widgets[key], args, session); 
	}
	// add args to the options array
	for(var key in args){
		params[key] = args[key]; 
	}
	if(!(template in forms)){
		return "Form "+template+".html does not exist!";
	} else {
		return mustache.render(forms[template], params);
	} 
}

function getOrCreateSession(sid){
	var cookies = {};
	var session = {}; 
	
	function setSessionTimeout(session){
		if("timeout" in session)
			clearTimeout(session.timeout); 
		session.timeout = setTimeout(function(){
			console.debug("Removing session object for "+session.sid); 
			delete sessions[session.sid];
		}, 60000*20); 
	}; 
		
	if(!sid || sid == "" || !(sid in sessions)){
		// generate new session
		var sid = String(crypto.createHash("sha1").update(String(Math.random())).digest("hex")); 
		session = {
			sid: sid,
			user: db.users.New(),
			render: function(tpl, opts){return SessionRenderForm(tpl, this, opts); },
			render_widgets: function(widgets, path, args, callback){
				var self = this; 
				var data = {}; 
				async.eachSeries(Object.keys(widgets), function(k, cb){
					widgets[k].render(path, args, self, function(x){
						data[k] = x; 
						cb(); 
					});
				}, function(){
					if(callback) callback(data); 
				});
			},
			rendered_widgets: {}
		}; 
		setSessionTimeout(session); 
		sessions[sid] = session; 
		console.debug("Creating new session: "+session.sid); 
	} else {
		session = sessions[sid]; 
		setSessionTimeout(session); 
	}
	return session; 
}

function parseCookieString(str){
	var cookies = {}; 
	str && str.split(';').forEach(function( cookie ) {
		var parts = cookie.split('=');
		cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
	});
	return cookies; 
}

function CreateServer(){
	http.createServer(function(req, res){
		try {
			console.log("============== SERVING NEW REQUEST ==============="); 
			var cookies = parseCookieString(req.headers.cookie); 
			var session = getOrCreateSession(cookies["session"]); 
			
			var query = url.parse(req.url, true);
			var docpath = query.pathname;
			var cleanpath = docpath.replace(/\/+$/, "").replace(/^\/+/, ""); 
							
			var args = {}
			Object.keys(query.query).map(function(k){args[k] = query.query[k];}); 
			
			var handler = current_theme; 
			// use plugin registered handler if anyone wants to do the rendering
			if(docpath in pages && pages[docpath].handler in handlers){
				console.debug("Will use special handler for page "+docpath); 
				handler = handlers[pages[docpath].handler];
			}
			
			
			var headers = {
				"Content-type": "text/plain"
			}; 
			
			function serveFile(res, filepath){
				fs.readFile(filepath, "binary", function(err, data){
					if(err) {
						res.end(); 
						return; 
					}
					
					var headers = {}; 
					
					headers["Content-type"] = mime_types[path.extname(docpath)]; 
					headers["Cache-Control"] = "public max-age=120";
					
					res.writeHead(200, headers);
					res.write(data, "binary"); 
					res.end(); 
				});
			}
			
			function renderWidgets(args, dst, callback){
				async.eachSeries(Object.keys(widgets), function(i, callback){
					console.log("Prerendering widget "+i); 
					var new_args = {};
					Object.keys(args).map(function(x){new_args[x] = args[x];}); 
					new_args["widget_id"] = widgets[i].id; 
					new_args["widget_arg"] = widgets[i].argument; 
					widgets[i].render(docpath, new_args, session, function(html){
						dst[i] = html;
						callback();
					}); 
				}, function(){
					callback(); 
				}); 
			}
			function serveGET(){
				var filepath = vfs.resolve(docpath); 
				
				console.debug("GET "+docpath);
				
				if(filepath){
					console.debug("Will serve file "+filepath); 
					serveFile(res, filepath); 
				} else {
					console.debug("Will serve PAGE "+docpath); 
					async.series([
						function(cb){
							renderWidgets(args, session.rendered_widgets, function(){cb();}); 
						}, 
						function(cb){
							headers["Set-Cookie"] = "session="+session.sid+"; path=/";
							headers["Content-type"] = "text/html; charset=utf-8"; 
							headers["Cache-Control"] = "public max-age=120";
							
							if(!handler) {
								res.writeHead(404, headers); 
								res.write("Path not found!"); 
								res.end(); 
								return; 
							}
							
							if("headers" in handler){
								for(var key in handler.headers){
									headers[key] = handler.headers[key];
								} 
							}
							
							// do the render, either though theme or plugin
							if("render" in handler || "get" in handler){
								(handler["render"] || handler["get"])(cleanpath, args, session,
									function(html){
										res.writeHead(200, headers); 
										res.write(html); 
										res.end(); 
								});
							} else {
								console.debug("Could not find render method in handler "+JSON.stringify(handler)); 
								res.writeHead(404, headers); 
								res.write("Page was not found on this server!"); 
								res.end(); 
							}
						}
					]);
				}
			}
			function servePOST(){
				var form = new formidable.IncomingForm();
				form.parse(req, function(err, fields, files) {
					console.debug("FORM: "+docpath+" > "+JSON.stringify(fields)+" > "+JSON.stringify(files)); 
					
					// TODO: do we need to update the signature of all handlers to accomodate for uploaded files or is this ok?
					if(Object.keys(files).length)
						args["uploaded_file"] = files["file"]; 
						
					Object.keys(fields).map(function(k){args[k] = fields[k]; }); 
					
					if("post" in handler){
						handler.post(cleanpath, args, session, function(response){
							res.writeHead(200, headers); 
							if(response) res.write(response); 
							res.end(); 
						}); 
					} else {
						res.writeHead(404, headers); 
						res.write("This page does not accept any post data!"); 
						res.end(); 
					}
				});
			}
			// upon a post request we simply process the post data 
			// and redirect the user to the same page. 
			if(req.method == "POST"){
				servePOST(); 
			} else if(req.method == "GET"){
				serveGET(); 
			}
		} catch(e) { // prevent server crash
			console.debug("FATAL ERROR WHEN SERVING CLIENT "+path+", session: "+JSON.stringify(session)+": "+e+"\n"+e.stack); 
			res.writeHead(200, {}); 
			res.write("Fatal server error occured. Please go to home page."); 
			res.end(); 
		}
	}).listen(config.server_port);
}

function main(){
	var loader = require("./modules/loader"); 
	server.db = db; 
	server.pages = db.pages; 
	server.config = config;
	server.basedir = BASEDIR; 
	server.widgets = widgets; 
	server.vfs = vfs; 
	server.users = db.users; 
	server.properties = db.properties; 
	
	server.handlers = {
		register: function(class_name, module){
			if(class_name in handlers){
				console.log("WARNING: Replacing handler for "+class_name); 
			}
			handlers[class_name] = module; 
			console.log("Registered handler for "+class_name); 
		}
	}
	
	server.get_widget_or_empty = function(name){
		if(!(name in widgets)){
			return {
				new: function(){throw "New can not be called on default widget! Fix your code!";},
				init: function(){},
				render: function(a, b, c, d){d("Default widget!");}
			}
		} 
		return widgets[name]; 
	}
	
	async.series([
		function(cb){
			loader.LoadModule(process.cwd(), function(module){
				if(!module){
					console.debug("Could not load core components!"); 
					process.exit(); 
				}
				core = module; 
				for(var key in module.forms) forms[key] = module.forms[key]; 
				for(var key in module.handlers){
					handlers[key] = module.handlers[key]; 
					handlers[key].init(server); 
					var hr = handlers[key]; 
					if("pages" in hr) {
						for(var h in hr.pages){
							console.debug("Setting page handler for "+hr.pages[h]+" to "+hr.name); 
							pages[hr.pages[h]] = {
								handler: hr.name
							}
						}
					}
				}
				for(var key in module.widgets) {
					widgets[key] = module.widgets[key]; 
					widgets[key].init(server); 
				}
				cb(); 
			});
		}, 
		function(callback){
			console.debug("Indexing module content in "+process.cwd()+"/content"); 
			vfs.add_index(process.cwd()+"/content", function(){
				callback(); 
			}); 
		},
		function(callback){
			console.debug("Loading plugins.."); 
			var directory = process.cwd()+"/plugins"; 
			console.debug("Loading plugins from "+directory); 
			fs.readdir(directory, function(err, files) {
				var plugins = []; 
				async.each(files, function(file, next){
					fs.stat(directory + '/' + file, function(err, stats) {
						console.log(JSON.stringify(stats)+" "+stats.isDirectory()); 
						if(stats.isDirectory()) {
							plugins.push(file); 
						}
						next(); 
					});
				}, loadplugins); 
				function loadplugins(){
					async.eachSeries(plugins, function(plug, cb){
						console.debug("Loading plugin "+plug); 
						loader.LoadModule(directory+"/"+plug, function(module){
							if(module){
								// for plugins we must prefix all resources with plugin name and underscore
								vfs.add_index(directory+"/"+plug+"/content", function(){
									cb(); 
								}); 
								module.init(server); 
								for(var key in module.forms) forms[plug+"_"+key] = module.forms[key]; 
								for(var key in module.handlers) {
									module.handlers[key].init(server); 
									handlers[key] = module.handlers[key]; 
								}
								for(var key in module.widgets) {
									module.widgets[key].init(server); 
									widgets[plug+"_"+key] = module.widgets[key]; 
								}
							} else {
								cb(); 
							}
						}); 
					}, function(){
						callback(); 
					}); 
				}
			});
		},
		function(cb){
			console.debug("Loading theme..."); 
			if(!fs.existsSync("./themes/"+config.theme)){
				console.debug("Theme "+config.theme+" not found!"); 
				cb(); 
			} else {
				loader.LoadModule(process.cwd()+"/themes/"+config.theme, function(module){
					if(module){
						current_theme = module; 
						current_theme.init(server); 
						server.vfs.add_index(process.cwd()+"/themes/"+config.theme+"/content"); 
						for(var key in module.forms) forms[key] = module.forms[key]; 
						for(var key in module.handlers) handlers[key] = module.handlers[key]; 
						for(var key in module.widgets) widgets[key] = module.widgets[key]; 
					}
					cb(); 
				}); 
			}
		}
	], function(){
		
		CreateServer(); 
		console.log("Server listening...");
	}); 
	
}



}

Fortmax(); 

