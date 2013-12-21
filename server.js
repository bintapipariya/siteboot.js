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
var sequelize = require("sequelize"); 
var util = require("util"); 
var events = require("events"); 
var assert = require("assert"); 
var Q = require("q"); 
var jquery = require("jquery");
var i18n = require("i18n"); 
var $ = require("jquery"); 

var cluster = require("cluster");
var ServerInterface = require("./lib/server_interface").ServerInterface; 
var ServerObject = require("./lib/server_object").ServerObject; 
var ServerView = require("./lib/server_view").ServerView; 
var SecurityPolicy = require("./lib/security_policy").SecurityPolicy; 

var extname = path.extname; 

var widgets = {};
var pages = {};
var forms = {}; 
var texts = {}; 
var handlers = {};
var plugins = {}; 
var core = {}; 

var locale = Object.create(i18n); 
locale.configure({
	locales: ["en", "se"], 
	directory: __dirname + "/lang", 
	defaultLocale: "en"
}); 

__ = locale.__; 

var mime_types = {
	'.html': "text/html",
	'.css':  "text/css",
	'.js':   "text/javascript",
	'.jpg': "image/jpeg",
	'.jpeg': "image/jpeg",
	'.png': "image/png"
};

var shellarg = function(cmd) {
  return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};


var theme = {};

var vfs = require("./modules/vfs"); 
var loader = require("./modules/loader"); 


// initialize console output
(function (){
	console.debug = function(msg){
		console.log(__("DEBUG: ")+msg); 
	}

	console._sb_err = console.error; 

	console.error = function(msg){
		console._sb_err(__("ERROR: ")+msg); 
	}

	console.info = function(msg){
		console.log(__("INFO: ")+msg); 
	}
})(); 

var User = function(){
	this.loggedin = false; 
	this.username = "default";
}

var Session = function(x){
	this.user = new User(); 
	this.rendered_widgets = {}; 
	this.object = x; 
}

Session.prototype = {
	get sid(){
		return this.object.sid; 
	}
}

Session.prototype.save = function(){
	server.emit("session_save", this); 
	this.object.save(); 
}

Session.prototype.toJSON = function(){
	return {
		sid: this.sid, 
		user: this.user,
		data: this.data
	}
}
			
function parseCookieString(str){
	var cookies = {}; 
	str && str.split(';').forEach(function( cookie ) {
		var parts = cookie.split('=');
		cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
	});
	return cookies; 
}


exports.shutdown = function(){
	server.http.close(); 
}

exports.init = function(site, config){
	return new SiteBoot(site, config); 
}

var SiteBoot = function(SiteClass, config){
	var self = this; 
	
	this.BASEDIR = __dirname+"/"; 
	this.config = config; 
	this.cache = {}; 
	this.cache.sessions = {}; 
	this.cache.mailer_templates = {}; 
	this.db = {}; 
	this.vfs = vfs; 
	this.plugins = plugins; 
	this.widget_types = {}; 
	this.widget_types["default"] = ServerView; 
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
	
	this.pool = {
		// get object by name
		get: function(model){
			if(model in self.db.objects){
				return new self.db.objects[model](); 
			}
			throw new Error("Object "+model+" not found!"); 
		}, 
		type: function(model){
			if(model in self.db.objects){
				return self.db.objects[model]; 
			}
			throw new Error("Object "+model+" not found!"); 
		}
	}
	
	if(!("site_path" in config)) config.site_path = process.cwd(); 

	console.log("Initializing database with configuration "+JSON.stringify(config.database));
	var db = new sequelize(config.database.database, config.database.user, config.database.password, {
		define: {
			charset: "utf8", 
			collate: 'utf8_general_ci',
			freezeTableName: true,
		},
		host: config.database.hostname,
		dialect: "mysql"
	}); 
	// test a query to make sure everything is working..
	db.query("select 1 from dual").error(function(err){
		console.error(__("Could not connect to database: %s", err));
		process.exit(); 
	}); 
	db.types = sequelize; 
	db.objects = {}; 
	
	this.db = db; 
	
	
	this.server = new ServerInterface(this);
	this.security = new SecurityPolicy(this.server); 
	this.site = new SiteClass(this.server); 
}

function setSessionTimeout(session){
	if("timeout" in session)
		clearTimeout(session.timeout); 
	session.timeout = setTimeout(function(){
		console.debug("Removing session object for "+session.sid); 
		server.emitAsync("session_destroy", session, function(){
			session.object.destroy(); 
			delete cache.sessions[session.sid];
		}); 
	}, 60000*(config.session_ttl||20)); 
}; 

SiteBoot.prototype.CreateWidget = function(view, object){
	var self = this; 
	var widget_types = this.widget_types; 
	var x = this.server; 
	
	if(!(view in widget_types)){
		console.debug("Widget type "+view+" does not exist!"); 
		return new widget_types["default"](x); 
	}

	var widget = new widget_types[view](x, object); 
	if(!widget) return new widgets_types["default"](x); 
	
	widget.name = view; 
	widget.object = object; 
	widget._object = object; 
	
	if("init" in widget)
		widget.init(server); 
	
	console.debug("Created widget "+view); 
	
	return widget; 
}

SiteBoot.prototype.RenderWidget = function(name, req){
	var ret = this.server.defer(); 
	var self = this; 
	
	var widgets = self.server.pool.get("res.widget"); 
	console.debug("RenderWidget: "+name); 
	widgets.find({name: name, language: req.language}).done(function(w){
		if(!w){
			ret.resolve({
				object: {},
				html: "Widget not found!"
			});
			return; 
		}
		var widget = self.CreateWidget(w.type, w); 
		widget.render(req).done(function(obj){
			var type = Object.prototype.toString.call(obj); 
			if(!obj || (type != "[object Object]")){
				console.error("Error while rendering "+name+" - returned object is not an object! ("+type+")"); 
				ret.resolve({
					object: {},
					html: "Undefined"
				});
				return; 
			}
			
			self.RenderFragmentsRaw(w.code, obj, req).done(function(html){
				ret.resolve({
					object: obj,
					html: html
				}); 
			}); 
		}); 
	});
							
	return ret.promise; 
}

SiteBoot.prototype.RenderFragments = function(template, fragments, context){
	return this.RenderFragmentsRaw(forms[template], fragments, context); 
}

SiteBoot.prototype.RenderFragmentsRaw = function(template, fragments, context){
	var proms = []; 
	var result = Q.defer();  
	var self = this; 
	
	var data = {}; 
	if(!fragments) fragments = {}; 
	
	Object.keys(fragments).map(function(x){
		if(fragments[x] && typeof fragments[x] == "object" && "done" in fragments[x]){
			proms.push([x, fragments[x] ]); 
		} else {
			data[x] = fragments[x]; 
		}
	}); 
	// render all promises
	async.eachSeries(proms, function(x, next){
		//console.debug("Rendering fragment "+x[0]+" for "+template); 
		var timeout = setTimeout(function(){
			console.error("Rendering timed out for "+x[0]);
			data[x[0]] = "Timed out!"; 
			next(); 
		}, 2000); 
		x[1].done(function(obj){
			//console.debug("Done rendering fragment "+x[0]+" for "+template); 
			clearTimeout(timeout); 
			data[x[0]] = obj.html; 
			next(); 
		}); 
	}, function(){
		data["__"] = function(){
			return function(text){
				if(context)
					return context.__.apply(context, arguments); 
				else 
					return text + "(untranslated)"; 
			}
		}
		var html = mustache.render(template||"", data); 
		
		// parse out the embedded widgets
		// syntax {{@<widgetclass> arg1="value" arg2="value"}}
		var tr = /\[\[\s*([\.0-9a-zA-Z:_]+)(.*?)\]\]/g;
		var results = {}; 
		var proms = {}; 
		
		html = html.replace(tr, function(){
			var argparse = /([^\s]+)=(["][^"]*["]|[^\s]*)/g; 
			
			var request = {}; 
			Object.keys(context).map(function(x){request[x] = context[x];}); 
			var args = {}; 
			Object.keys(context.args).map(function(x){args[x] = context.args[x];}); 
			
			while(m = argparse.exec(arguments[2])){
				console.log("Adding argument "+m[1]+": "+m[2].replace(/\"/g, "")); 
				args[m[1]] = m[2].replace(/\"/g, ""); 
			}
			results[arguments[1]] = args; 
			var view = "view_"+arguments[3]; 
			
			console.debug("Adding to render queue: "+arguments[0]); 
			//proms[view] = self.CreateWidget(arguments[1], args).render(context); 
			request.args = args; 
			
			proms[view] = self.RenderWidget(arguments[1], request); 
			
			return "{{{"+view+"}}}"; 
		}); 
		//}
		// at this point the html contains all translated labels and the only thing that is left to do is replace the inserted tags with the actual content. In order to do that, we need to loop through the content to be rendered, render it, and then to run render on the result. 
		if(Object.keys(proms).length){
			// Only render if there is something to render
			self.RenderFragmentsRaw(html, proms, context).done(function(html){
				result.resolve(html); 
				//wrap_result(html); 
			}); 
		} else {
			//wrap_result(html);
			result.resolve(html); 
		}
		function wrap_result(html){
			//result.resolve(html); 
			result.resolve(mustache.render(forms["widget.wrapper"], {
				content: html
			})); 
		}
	}); 
	return result.promise; 
}

SiteBoot.prototype.ClientRequest = function(request, res){
	var self = this; 
	/*
	if(self.inprogress){
		setTimeout(function(){
			self.ClientRequest(req, res); 
		}, 0); 
		return; 
	} 
	self.inprogress = true; 
	*/
	var cookies = parseCookieString(request.headers.cookie); 

	var query = url.parse(request.url, true);
	var docpath = query.pathname.replace(/\/+$/, "").replace(/^\/+/, "").replace(/\/+/g, "/");
	var splitpath = docpath.split("/"); 
	var site = this.site; 
	
	var args = {}
	Object.keys(query.query).map(function(k){args[k] = query.query[k];}); 
	
	var req = {
		path: docpath, 
		args: args,
		meta: {}, 
		method: query.method, 
		session: null,
		render: function(template, fragments){
			return self.RenderFragments(template, fragments, this); 
		}, 
		command: function(cmd, args){
			var user = (this.session.user)?this.session.user.username:"(guest)"; 
			console.log(user+" > "+cmd+" : "+args); 
			return self.console.exec(cmd, args); 
		}, 
		can: function(perm){
			if(!this.session.user) return false; 
			return this.session.user.can(perm); 
		}
	}
	
	try {
		// default headers
		var resp = {
			headers: {
				"Content-type": "text/html",
				"Cache-Control": "no-cache"
			},
			code: 200,
			data: "Default data"
		}
		
		function copyResponse(response){
			if(!response) return; 
			if(typeof(response) === "object"){
				Object.keys(response.headers||{}).map(function(x){
					resp.headers[x] = response.headers[x]; 
				}); 
				resp.code = response.code || resp.code; 
				resp.data = response.data || resp.data; 
				resp.type = response.type || resp.type; 
				if("Location" in resp.headers)
					resp.code = 301
			} else {
				resp.data = response; 
			}
		}
			
		var page = null; 
		async.waterfall([
			function(next){
				// first try to serve an ordinary static file if it exists
				var filepath = self.vfs.resolve("/"+docpath); 
				if(fs.existsSync(filepath)){
					console.debug("GET STATIC: "+docpath);
					
					fs.readFile(filepath, "binary", function(err, data){
						if(err) {
							copyResponse({
								code: 404,
								data: "Error reading file: "+err
							});  
							next("file"); 
						}
						
						copyResponse({
							code: 200,
							headers: {
								"Content-type": mime_types[extname(path)],
								"Cache-Control": "public max-age=120"
							},
							data: data,
							type: "binary"
						});  
						next("file"); 
					});
				} else {
					next(); 
				}
			}, 
			function(next){
				var sid = cookies["session"]; 
				console.debug("Looking up session: "+sid); 
				// the perfect solution for multiple simultaneous requests coming in at the same time for the same session. 
				if(!self.cache.sessions[sid]){
					self.cache.sessions[sid] = {
						sid: sid, 
						session: null, 
						promise: function(){
							if(this.session) this.session.reload(); 
							if(!this._promise){
								this._promise = Q.defer(); 
								var ret = this._promise; 
								var sessions = self.pool.get("res.session"); 
								sessions.find({sid: this.sid}).done(function(session){
									if(!session){
										sessions.create({language: "en"}).done(function(session){
											console.debug("Created new session in database with sid: "+session.sid);
											ret.resolve(session); 
										}); 
									} else {
										console.debug("Loaded existing session: "+session.sid);
										ret.resolve(session); 
									}
								}); 
								return ret.promise; 
							} else {
								return this._promise.promise; 
							}
						}
					}
				} 
				self.cache.sessions[sid].promise().done(function(session){
					session.reload().done(function(){
						req.session = session; 
						// set up session locale
						var i = Object.create(i18n); 
						var lang = req.language = req.session.language = (req.args["lang"]||req.session.language||"en"); 
						
						i.configure({
							locales: ["en", "se"],
							directory: self.config.site_path+"/lang",
							defaultLocale: lang
						}); 
						req.__ = i.__; 
						
						console.debug("Setting session sid cookie: "+session.sid); 
						resp.headers["Set-Cookie"] = "session="+session.sid+"; path=/"; 
					
						next(); 
					}); 
				}); 
			}, 
			function(next){
				// time to serve some files
				if("fx-get-client-scripts" in req.args){
					copyResponse({
						headers: {
							"Content-type": "text/javascript"
						}, 
						data: "var session = "+JSON.stringify(req.session)+"; \n"+self.client_code
					}); 
					next("end"); 
					return; 
				} else if("fx-get-client-styles" in req.args){
					copyResponse({
						headers:  {
							"Content-type": "text/css"
						}, 
						data: self.client_style
					}); 
					next("end"); 
					return; 
				}
				
				// get the page for current url because it's either a post or a get request
				var pages = self.pool.get("res.page"); 
				console.debug("Looking up page "+req.path+" language: "+req.language); 
				pages.find({
					path: req.path||"home",
					language: req.language
				}).done(function(p){
					if(!p){
						console.debug("No page found for path "+docpath+"..."); 
						copyResponse({
							code: 404,
							data: "Not found!"
						}); 
						next("page"); 
					} else {
						page = p; 
						next(); 
					}
				}); 
			}, 
			function(next){
				var session = req.session; 
				
				if(request.method != "POST"){
					next(); 
					return; 
				}
				
				var form = new formidable.IncomingForm();
				form.parse(request, function(err, fields, files) {
					req.args["files"] = files; 
					
					console.debug("POST FORM: "+docpath+" > "+JSON.stringify(fields)+" > "+JSON.stringify(files)); 
					
					self.security.isAllowed(req).done(function(allowed){
						if(!allowed){
							console.log("ACCESS DENIED: "+docpath); 
							next("error"); 
							return; 
						} else {
						
							Object.keys(fields).map(function(k){args[k] = fields[k]; });
							
							var rcpt = args["rcpt"]; 
							if(rcpt && rcpt in self.widget_types && "post" in self.widget_types[rcpt].prototype){
								console.debug("Passing post data to widget type "+rcpt);
								
								var objs = self.server.pool.get("res.widget"); 
								objs.find({name: args["object_id"]}).done(function(obj){
									var w = self.CreateWidget(rcpt, obj); 
									w.post(req).done(function(response){
										console.debug("Post callback completed: "+JSON.stringify(response));  
										copyResponse(response); 
										next("ajax", session); 
									}); 
								}); 
							} /*else if(rcpt && rcpt in plugins && "post" in plugins[rcpt]){
								console.debug("Passing post data to plugin "+rcpt); 
								plugins[rcpt].post(req).done(function(response){
									copyResponse(response); 
									next(null, session); 
								}); 
							} else if("post" in site){
								site.post(req).done(function(response){
									copyResponse(response); 
									next();
								}); 
							} */
							else {
								var w = self.CreateWidget(page.template, page); 
								w.post(req).done(function(response){
									copyResponse(response); 
									next("ajax", session); 
								}); 
							}
						}
					}); 
				}); 
			},  
			function(next){
				var session = req.session; 
				
				console.log("GET: "+docpath); 
				
				req.args = query.query; 
				
				self.security.isAllowed(req).done(function(allowed){
					if(!allowed){
						console.log("ACCESS DENIED: "+docpath); 
						next("error"); 
						return; 
					} else {
						self.RenderWidget(page.template, req).done(function(result){
							var title = mustache.render(page.title_template, req.meta); 
							req.render("root", {
								title: title,
								console: (req.can("admin"))?"[[console]]":"", 
								content: result.html,
							}).done(function(html){
								copyResponse(html); 
								next();
							});
						}); 
					}
				}); 
				
			}
		], function(err){
			//console.debug("Writing response to client: "+JSON.stringify(resp.headers)); 
			
			// save the session
			if(req.session)
				req.session.save();
			
			if(!resp.data){
				res.writeHead(404, {}); 
				res.end(); 
			} else {
				res.writeHead(resp.code, resp.headers); 
				res.write(resp.data, resp.type); 
				res.end(); 
			}
			self.inprogress = false; 
		}); 
	} catch(e) { // prevent server crash
		console.debug("FATAL ERROR WHEN SERVING CLIENT "+path+": "+e+"\n"+e.stack); 
		res.writeHead(200, {}); 
		res.write("Fatal server error occured. Please go to home page."); 
		res.end(); 
		self.inprogress = false; 
	}
}

SiteBoot.prototype.registerObjectFields = function(name, fields){
	var table = {}; 
	var self = this; 
	var ret = Q.defer(); 
	
	if(!(name in self.db.objects)){
		self.db.objects[name] = table = self.db.define(name, fields); 
		table.sync().success(function(){
			async.eachSeries(Object.keys(fields), function(f, next){
				//console.info("Updating field "+f+" for "+name+"!"); 
				if(!self.config.update){
					next(); 
					return; 
				}
				var def = {}; 
				if(typeof(fields[f]) == "object") def = fields[f]; 
				else def = {type: fields[f]}; 
				
				// need to prevent setting primary key twice
				self.db.getQueryInterface().changeColumn(table.tableName, f, def)
				.success(function(){next();})
				.error(function(err){
					console.debug("ERROR: "+err); 
					self.db.getQueryInterface().addColumn(table.tableName, f, def)
					.success(function(){next();})
					.error(function(err){
						console.debug("ERROR: "+err);  
						next(); 
					}); 
				}); 
			}, function(){
				table.sync().success(function(){
					ret.resolve(table);
				}).error(function(){
					ret.resolve(table); 
				});
			}); 
		}); 
	} else {
		var table = self.db.objects[name]; 
		async.eachSeries(Object.keys(fields), function(f, next){
			console.info("Registering field "+f+" for "+name+"!"); 
			var field = {}; 
			if(typeof(fields[f]) == "object") field = fields[f]; 
			else field = {type: fields[f]}; 
			
			if(!self.config.update){
				next(); 
				return; 
			} else if(!field.primaryKey){
				self.db.getQueryInterface().changeColumn(table.tableName, f, field)
				.success(function(){next();})
				.error(function(err){
					console.debug("ERROR: "+err); 
					self.db.getQueryInterface().addColumn(table.tableName, f, field)
					.success(function(){next();})
					.error(function(err){
						console.debug("ERROR: "+err);  
						next(); 
					}); 
				});   
			} else {
				next();
			}
		}, function(){
			ret.resolve(table); 
		}); 
	}
	return ret.promise;  
}

SiteBoot.prototype.StartServer = function(){
	var self = this; 
	self.http = http.createServer(function(req, res){
		self.ClientRequest(req, res); 
	});
	self.http.listen(self.config.server_socket||self.config.server_port||8000);
}

SiteBoot.prototype.boot = function(){
	var loader = require("./modules/loader"); 
	console.debug("====== BOOTING SITE ======"); 
	
	var self = this; 
	var server = this.server; 
	
	var site = this.site; 
	
	function LoadPlugins(directory, next){
		console.debug("Loading plugins from "+directory); 
		if(!fs.existsSync(directory)){
			next(); 
			return; 
		}
		fs.readdir(directory, function(err, files) {
			var pl = []; 
			if(err || !files){
				next(); 
				return; 
			}
			async.each(files||[], function(file, next){
				fs.stat(directory + '/' + file, function(err, stats) {
					if(stats.isDirectory()) {
						pl.push(file); 
					}
					next(); 
				});
			}, loadplugins); 
			function loadplugins(){
				async.eachSeries(pl, function(plug, cb){
					console.debug("Loading plugin "+plug); 
					LoadModule(directory+"/"+plug, function(module){
						plugins[plug] = module; 
						cb();
					}, plug); 
				}, function(){
					next(); 
				}); 
			}
		});
	}
	function LoadModule(path, cb, prefix){
		prefix = prefix || ""; 
		loader.LoadModule(path, function(module){
			if(!module){
				console.error("Could not load module "+path);
				cb(null); 
				return; 
			}
			async.series([
				// add content to web root
				function(next){
					vfs.add_index(path+"/content", next); 
				},  
				// load objects
				function(next){
					if(!fs.existsSync(path+"/objects")){
						next(); 
						return; 
					}
					fs.readdir(path+"/objects", function(err, files){
						if(files) files.sort(); 
						async.eachSeries(files, function(file, next){
							if(!/.*js$/.test(file)){
								next(); 
								return; 
							}
							file = path+"/objects/"+file; 
							console.debug("Loading object from "+file); 
							var model = require(file).model; 
							
							var required = ["constructor", "fields", "name"];
							var fail = false;  
							if(!model){
								console.error("Object definition in "+file+" is missing 'model' field defining the model of the object!"); 
								fail = true; 
							} else {
								required.map(function(x){
									if(!(x in model)){
										console.error("Object definition in "+file+" is missing required field "+x);
										fail = true; 
									}
								}); 
							}
							if(fail){
								next();
								return; 
							}
							
							if(!model.tableName)
								model.tableName = model.name.replace(/\./g, "_"); 
								
							// resolv all the types
							Object.keys(model.fields).map(function(x){
								if(typeof(model.fields[x]) == "object"){
									var typename = model.fields[x].type.toString().toUpperCase(); 
									if(!(typename in self.db.types)){
										delete model.fields[x]; 
									} else {
										model.fields[x].type = self.db.types[typename]; 
									}
								} else {
									model.fields[x] = self.db.types[model.fields[x].toString().toUpperCase()]; 
								}
							}); 
							
							console.debug(Object.keys(model.fields)); 
							
							self.registerObjectFields(model.tableName, model.fields).done(function(def){
								var child = model.constructor; // Child type as function Child(){}
								if(!child) 
									throw Error("Model must contain a constructor property!"); 
								if(!def) 
									throw Error("There was an error in your definition!"); 
								
								var proto = child.prototype; 
								
								// replace prototype with base class 	
								if(model.name in self.db.objects){
									console.debug("DDDDD overriding object "+model.name); 
									self.server.extend(child, self.db.objects[model.name]); 
									//child.prototype = new self.db.objects[model.name](); 
									//child.prototype.super = self.db.objects[model.name].prototype; 
								} else {
									self.server.extend(child, ServerObject); 
									//child.prototype = new ServerObject(); 
									//child.prototype.super = ServerObject.prototype;
								}
								
								child.prototype._table = def; 
								child.prototype._object_name = model.name; 
								child.prototype.server = self.server; 
								//child.prototype.constructor = child; 
								
								// define object getters and setters for each field
								Object.keys(model.fields).map(function(f){
									//console.debug("Defining getter for field "+f+" of "+model.name); 
									child.prototype.__defineGetter__(f, function(){
										//if(this._write && (f in this._write))
										//	return this._write[f]; 
										if(this._object) 
											return this._object[f]; 
										return null; 
									});
									child.prototype.__defineSetter__(f, function(v){
										//if(!this._write) this._write = {}; 
										this._write[f] = true; 
										if(this._object)
											this._object[f] = v; 
									});
								}); 
								
								self.db.objects[model.name] = child; 
								
								def.sync().success(function(){
									if(model.index && self.config.update){
										self.db.getQueryInterface().removeIndex(def.tableName, def.tableName+"_main_index").success(function(){
										
											self.db.getQueryInterface().addIndex(def.tableName, model.index, {
												indexName: def.tableName+"_main_index",
												indicesType: 'UNIQUE'
											}); 
										}).error(function(err){
											self.db.getQueryInterface().addIndex(def.tableName, model.index, {
												indexName: def.tableName+"_main_index",
												indicesType: 'UNIQUE'
											}); 
										}); 
									}
									next(); 
								});  
								
							}); 
							
						}, function(){
							next(); 
						}); 
					});
				},
				
				// load all the forms
				function(next){
					for(var key in module.forms) {
						var name = ((prefix)?(prefix+":"):"")+key; 
						forms[name] = module.forms[key]; 
					}
					next(); 
				},
				// load all widgets
				function(next){
					var widgets = self.server.pool.get("res.widget"); 
					console.log("Loading all widgets for module "+path); 
					async.eachSeries(Object.keys(module.widgets), function(key, next){
						var name = ((prefix)?(prefix+":"):"")+key; 
						
						console.debug("Loading widget "+name); 
						widgets.find({
							name: name
						}, {
							name: name, 
							type: name, 
							code: forms[name],
							parent: null,
							original_template: forms[name]
						}).done(function(w){
							w.original_template = forms[name]; 
							w.code = forms[name]; 
							
							self.widget_types[name] = module.widgets[key]; 
							var x = Object.create(server); 
							
							// replace the render method with a widget specific method that takes into account template prefixing TODO
							x.render = function(template, data){
								// if already prefixed with plugin name then we just render as normal. 
								console.debug("Rendering template "+template+" for "+prefix); 
								if(template.indexOf(prefix) == 0) 
									return server.render(template, data); 
								// otherwise prefix it with the plugin name
								return server.render(((prefix)?(prefix+":"):"")+template, data); 
							} 
							
							var child = self.widget_types[name]; 
							if(!child) throw Error("View type not defined!"); 
							
							self.server.extend(child, ServerView); 
							
							child.prototype.server = x; 
							child.prototype.widget_id = name;
							child.prototype._name = name; 
							
							w.save().done(function(){
								next(); 
							}); 
						}); 
					}, function(){
						next();
					}); 
				},
				// load client code
				function(next){
					if(!self.client_code)
						self.client_code = ""; 
						
					if(!fs.existsSync(path+"/client")){
						next(); 
						return; 
					}
					fs.readdir(path+"/client", function(err, files){
						if(files) files.sort(); 
						for(var key in files){
							var file = files[key]; 
							if(/\.js$/.test(file)){
								console.log("Loading client script "+path+"/client/"+file); 
								self.client_code += fs.readFileSync(path+"/client/"+file); 
							}
						}
						next(); 
					});
				},
				// load css code
				function(next){
					var dirname = path+"/css/"; 
					if(!self.client_style)
						self.client_style = ""; 
					if(!fs.existsSync(dirname)){
						next(); 
						return; 
					}
					fs.readdir(dirname, function(err, files){
						if(files) files.sort(); 
						for(var key in files){
							var file = files[key]; 
							if(/\.css$/.test(file)){
								console.log("Loading stylesheet "+dirname+file); 
								var css = fs.readFileSync(dirname+file); 
								if(css)
									self.client_style += css; 
							}
						}
						next(); 
					});
				}, 
				// load mailer templates into cache
				function(next){
					var dirname= path+"/mailer_templates/"; 
					if(!fs.existsSync(dirname)){
						next(); 
						return; 
					}
					fs.readdir(dirname, function(err, files){
						if(files) files.sort(); 
						files.map(function(file){
							if(fs.statSync(dirname+file).isDirectory()){
								console.log("Adding mailer template: "+dirname+file); 
								self.cache.mailer_templates[file] = {
									path: dirname,
									template: file
								}; 
							}
						}); 
						next(); 
					});
				}
			], function(){
				console.debug("Loaded module from path "+path); 
				module.server = self.server; 
				
				if("init" in module) {
					var t = setTimeout(function(){
						console.error("Module initialization timed out for "+path); 
						cb(module); 
					}, 5000); 
					
					
					module.init(server).done(function(){
						clearTimeout(t); 
						cb(module); 
					}); 
				} else {
					cb(module);
				}
			}); 
		});
	}
	async.series([
		function(cb){
			LoadModule(__dirname, function(module){
				if(!module){
					console.debug("Could not load core components!"); 
					process.exit(); 
				}
				core = module;
				cb(); 
			}); 
		}, 
		function(next){
			console.debug("Loading core plugins.."); 
			LoadPlugins(__dirname+"/plugins", next); 
		},
		function(callback){
			console.debug("Indexing module content in "+__dirname+"/content"); 
			vfs.add_index(__dirname+"/content", function(){
				callback(); 
			}); 
		},
		function(cb){
			console.debug("Loading site data..."); 
			LoadModule(self.config.site_path, function(module){
				if(!module){
					console.error("Could not load main site module!");
					process.exit(); 
				} 
				cb(); 
			}); 
		},
		function(next){
			console.debug("Loading site plugins.."); 
			LoadPlugins(self.config.site_path+"/plugins", next); 
		}
	], function(){
		if (cluster.isMaster) {
			// this is the master control process
			console.log("Control process running: PID=" + process.pid);

			// fork as many times as we have CPUs
			var numCPUs = require("os").cpus().length;

			cluster.fork();

			// handle unwanted worker exits
			cluster.on("exit", function(worker, code) {
				if (code != 0) {
					console.log("Worker crashed! Spawning a replacement.");
					cluster.fork();
				}
			}); 
		} else {
			/*process.on('uncaughtException', function (err) {
				var crash = "=============================\n";
				crash += "Program crashed on "+(new Date())+"\n"; 
				crash += (err)?err.stack:err; 
				console.error(crash); 
				fs.appendFile(self.config.site_path+"/crashlog.log", crash); 
			});*/
			
			var server_started = false; 
			setTimeout(function(){
				if(!server_started) {
					console.error("Site is taking too long to start! did you forget to call 'next' in the site 'init' method?"); 
					process.exit(); 
				}
			}, 30000); 
			
			console.debug("Starting site..."); 
			site.init(server).done(function(){
				self.StartServer(); 
				server_started = true; 
				console.log("Server listening on "+(self.config.server_socket||self.config.server_port||"localhost"));
			});
		}
	}); 
	
}



