var Q = require("q"); 
var crypto = require("crypto"); 
var async = require("async"); 

function Page(obj){
	this._object = obj; 
	return this.super.constructor.call(this); 
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
		title_template: "string", 
		widget_ids: {
			type: "integer",
			referencesKey: "id",
			referencesTable: "widgets"
		}
	}
}
