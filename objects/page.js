var Q = require("q"); 
var crypto = require("crypto"); 
var async = require("async"); 

function Page(obj){
	this._object = obj; 
	return this.super.constructor.call(this); 
}

Page.prototype._loadProperties = function(context){
	var self = this; 
	var ret = self.server.defer(); 
	
	self.properties = {}; 
	self._properties_orig = {}; 
	
	var props = self.server.pool.get("res.property"); 
	var search = {object_type: "page", object_id: self._object.id}; 
	if(context && context.lang)
		search.language = context.lang; 
	else
		search.language = null
		
	props.search(search).done(function(ids){
		console.debug("Browsing "+ids.length+" properties"); 
		props.browse(ids).done(function(ps){
			ps.map(function(x){
				self.properties[x.name] = x.value;
				self._properties_orig[x.name] = x.value;
			}); 
			ret.resolve(); 
		}); 
	}); 
	
	return ret.promise; 
}

Page.prototype.browse = function(ids, context){
	var self = this; 
	var ret = self.server.defer(); 
	
	// generate the property dict
	self.super.browse.call(this, ids, Page).done(function(objs){
		async.forEachSeries(objs, function(x, next){
			x._loadProperties(context).done(function(){
				next(); 
			});
		}, function(){
			ret.resolve(objs); 
		}); 
	}); 
	return ret.promise; 
}

Page.prototype.create = function(opts){
	var ret = this.server.defer(); 
	// skip errors for page creation
	this.super.create.call(this, opts).done(function(){
		ret.resolve(); 
	}, function(){
		ret.resolve(); 
	}); 
	return ret.promise; 
}

exports.model = {
	constructor: Page,
	name: "res.page",
	fields: {
		id: {
			type: "integer",
			primaryKey: true,
			autoIncrement: true
		},
		path: {
			type: "string",
			unique: true
		}, 
		template: {
			type: "string"
		}, 
		widget_ids: {
			type: "integer",
			referencesKey: "id",
			referencesTable: "widgets"
		}
	}
}
