
var Property = function(obj){
	this._object = obj; 
	return this.super.constructor.call(this); 
}


exports.model = {
	constructor: Property,
	name: "res.property",
	fields: {
		id: {
			type: "integer",
			primaryKey: true,
			autoIncrement: true
		}, 
		object_type: "string",
		object_id: "integer",
		name: "string",
		value: "text",
		language: "string"
	}, 
	index: ["object_type", "object_id", "name", "language"]
}
