
exports.init = function(db){
	return db.define("property", {
		object_type: db.types.STRING,
		object_id: db.types.STRING,
		property_name: db.types.STRING,
		property_value: db.types.TEXT
	}, {
		classMethods: {
			
		}
	}); 
}
