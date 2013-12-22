var Q = require("q"); 
var async = require("async"); 

var ServerInterface = function(siteboot){
	this.siteboot = siteboot; 
	this.q = Q; 
	this.config = siteboot.config;
	this.basedir = siteboot.BASEDIR; 
	this.widgets = siteboot.widgets; 
	this.vfs = siteboot.vfs; 
	this.pool = siteboot.pool; 
	this.db = siteboot.db; 
	this.client_code = siteboot.client_code; 
	this.client_style = siteboot.client_style; 
	this.security = siteboot.security; 
	this.mailer.siteboot = this; 
	this.filter = siteboot.filter; 
	this.console = siteboot.console; 
	this.plugins = siteboot.plugins; 
}

ServerInterface.prototype.q = Q; 
ServerInterface.prototype.mailer = {
	send: function(options, next){
		var path         = require('path'); 
		var emailTemplates = require('email-templates'); 
		var nodemailer     = require('nodemailer');
		var self = this; 
		
		next = next||function(){}; 
		
		if(!options.to || !options.from || !options.template){
			console.error("Mailer: You must specify both to, from and template in options: "+JSON.stringify(options)); 
			next(""); 
			return; 
		}
		options.subject = options.subject||"(no subject)"; 
		
		var tpl = {
			path: __dirname+"/../mailer_templates", 
			template: "default"
		}
		
		emailTemplates(tpl.path, function(err, template) {
			if (err) {
				console.log(err);
				return; 
			} 
			var transportBatch = nodemailer.createTransport("SMTP", self.siteboot.config.mailer.smtp);
			
			var Render = function(data) {
				this.data = data;
				this.send = function(err, html, text) {
					if (err) {
						console.log(err);
						next(""); 
						return; 
					} 
					
					// send the email
					transportBatch.sendMail({
						from: options.from,
						to: options.to,
						subject: options.subject,
						html: html,
						generateTextFromHTML: true
					}, function(err, responseStatus) {
						if (err) {
							console.log(err);
						} else {
							console.log(responseStatus.message);
						}
						
						next(html); 
					});
				};
				this.batch = function(batch) {
					try{
						batch(this.data, "mailer_templates", this.send);
					} catch(e){
						console.log("ERROR WHILE SENDING EMAILS: "+e+"\n"+e.stack); 
						next(""); 
					}
				};
			};
			
			console.debug("Using mailer template: "+tpl.path+"/"+tpl.template); 
			
			// Load the template and send the emails
			template(tpl.template, true, function(err, batch) {
				var render = new Render(options.data||{});
				render.batch(batch);
			});
		});
	}
}; 

ServerInterface.prototype.extend = function extend(Child, Base){
	var proto = Child.prototype; 
	Child.prototype = new Base();
	Child.prototype.super = Base.prototype; 
	Object.keys(proto).map(function(x){
		Child.prototype[x] = proto[x]; 
	}); 
}

ServerInterface.prototype.render = function(template, fragments, context){
	return this.siteboot.RenderFragments(template, fragments, context); 
}

ServerInterface.prototype.render_raw = function(template, fragments, context){
	return this.siteboot.RenderFragmentsRaw(template, fragments, context); 
}

ServerInterface.prototype.defer = function(){
	return Q.defer(); 
}


ServerInterface.prototype.create_widget = function(c, object){
	return this.siteboot.CreateWidget(c, object); 
}

ServerInterface.prototype.registerObjectFields = function(name, fields){
	return this.siteboot.registerObjectFields(name, fields); 
}

ServerInterface.prototype.getClientCode = function(session){
	return "var livesite_session = "+(JSON.stringify(session) || "{}")+";\n\n"+this.client_code; 
}; 

exports.ServerInterface = ServerInterface; 
