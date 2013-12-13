var Q = require("q"); 
var crypto = require("crypto"); 
var async = require("async"); 

function Widget(obj){
	this._object = obj; 
	return this.super.constructor.call(this); 
}

exports.model = {
	constructor: Widget,
	name: "res.widget",
	fields: {
		id: {
			type: "integer",
			primaryKey: true,
			autoIncrement: true
		},
		name: {
			type: "string",
			unique: true
		}
	}
}
