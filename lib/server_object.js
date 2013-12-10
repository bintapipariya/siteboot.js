var Q = require("q"); 
var JSON = require("JSON"); 
var async = require("async"); 

var ServerObject = function(x){
	this._object = x; 
	this._write = {}; 
}

ServerObject.prototype.obj = function(){
	return this._object; 
}

ServerObject.prototype._create = function(name, o){
	var x = this.server.pool.type(this._object_name); 
	var obj = new x(obj); 
	obj._object = o; 
	return obj; 
}

/**
 * Use this method to initialize the object CLASS.
 * This method is called only once, right after the object class is loaded.
 * */
ServerObject.prototype.init = function(){
	var ret = Q.defer(); 
	ret.resolve(); 
	return ret.promise; 
}

ServerObject.prototype.initInstance = function(){
	var ret = this.server.defer(); 
	ret.resolve(); 
	return ret.promise; 
}

ServerObject.prototype.create = function(opts){
	var result = Q.defer(); 
	var self = this; 
	this._table.create(opts).success(function(o, created){
		var obj = self._create(self._object_name, o); 
		obj.initInstance().done(function(){
			result.resolve(obj, created); 
		}); 
	}).error(function(err){
		console.error(err); 
		result.resolve(); 
	}); 
	return result.promise; 
}

ServerObject.prototype.remove = function(ids){
	var result = Q.defer(); 
	var where = {where: ["id in (?)", ids]}; 
	if(ids && ids.length){
		this._table.findAll(where).success(function(objs){
			async.forEach(objs, function(obj, next){
				obj.destroy().success(function(){
					next(); 
				}); 
			}, function(){
				result.resolve(); 
			}); 
		}); 
	} else {
		console.error("Zero length ids list passed to remove()"); 
		result.resolve(); 
	}
	
	return result.promise; 
}

ServerObject.prototype.search = function(opts, context){
	var result = Q.defer(); 
	
	if(opts){
		this._table.findAll({where: opts}).success(finish); 
	} else {
		this._table.findAll().success(finish);
	}
	function finish(objs){
		var ret = [];
		if(objs)
			ret = objs.map(function(x){return x.id}); 
		result.resolve(ret); 
	}
	return result.promise; 
}

ServerObject.prototype.find = function(opts, vals, context){
	var ret = Q.defer(); 
	var self = this; 
	
	self.search(opts).done(function(ids){
		if(ids.length == 0){
			if(vals){
				self.create(vals, context).done(function(obj){
					ret.resolve(obj); 
				}); 
			} else {
				ret.resolve(null); 
			}
		} else {
			self.browse([ids[0]], context).done(function(objs){
				if(objs.length){
					ret.resolve(objs[0]); 
				}
				else
					ret.resolve(null); 
			});
		}
	}); 
	return ret.promise; 
}

ServerObject.prototype.browse = function(ids, context){
	var result = Q.defer(); 
	var self = this; 
	
	if(!ids || !ids.length){
		result.resolve([]); 
		return result.promise; 
	}
	
	var argtype = Object.prototype.toString.call(ids); 
	var where = null; 
	
	if( argtype == "[object Array]")
		where = {where: ["id in (?)", ids]}; 
	else if(argtype == "[object Number]")
		where = {where: ["id = ?", ids]}; 
	else if(argtype == "[object Object]")
		where = {where: where}
	else if(argtype == "[object Undefined]")
		where = null
	else
		where = null; 
		
	if(ids && where){
		self._table.findAll(where).success(function(objs){
			//console.debug("Found "+objs.length+" objects.."); 
			var list = []; 
			async.forEachSeries(objs, function(x, next){
				console.debug("Returning object of type "+self._object_name); 
				var obj = self._create(self._object_name, x); 
				obj.initInstance().done(function(){
					list.push(obj); 
					next(); 
				}); 
			}, function(){
				result.resolve(list); 
			}); 
		}); 
	} else {
		result.resolve([]); 
	}
	
	return result.promise; 
}

ServerObject.prototype.save = function(){
	var ret = this.server.defer(); 
	if(this._object){
		// TODO: check if the item was already changed by someone else 
		console.debug("Writing attributes: "+Object.keys(this._write)); 
		console.debug("Object: "+JSON.stringify(this._object.values)); 
		this._object.save(Object.keys(this._write)).success(function(){
			ret.resolve(); 
		}).error(function(){
			ret.reject(); 
		}); 
		
		this._write = {}; 
	} else {
		ret.reject(); 
	}
	return ret.promise; 
}

ServerObject.prototype.destroy = function(){
	var ret = this.server.defer(); 
	if(this._object){
		this._object.destroy().success(function(){
			ret.resolve(); 
		}).error(function(err){
			ret.reject(err); 
		}); 
	} else {
		ret.reject("ServerObject.destroy(): _object is null!"); 
	}
	return ret.promise; 
}

// Used for for example setting form values
ServerObject.prototype.setValues = function(vals){
	var ret = this.server.defer(); 
	var self = this; 
	
	if(self._object && vals){
		Object.keys(vals).map(function(k){
			if(self._object && k in self._object.values){
				console.debug("Setting key "+k); 
				self[k] = vals[k]; 
			}
		}); 
		ret.resolve(); 
	} else {
		ret.resolve(); 
	}
	
	return ret.promise; 
}

ServerObject.prototype.toJSON = function(){
	return this._object.values; 
}

exports.ServerObject = ServerObject; 
