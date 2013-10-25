
exports.init = function(db){
	return db.define("user", {
		username: db.types.STRING,
		hash: db.types.STRING,
		role: db.types.STRING
	}, {
		classMethods: {
			login: function(username, hash, session, callback){
				if(!username || !hash || !session){
					callback("Need username and sha1 hash and session parameters!"); 
					return; 
				}
				users.find({where: {username: username}}).success(function(user){
					console.log("Login: user.hash: "+user.hash+", key: "+session.sid); 
					if(hash == crypto.createHash("sha1").update(user.hash+session.sid).digest('hex')){
						session.user = {
							username: user.username,
							role: user.role, 
							loggedin: true
						};  
						callback(undefined, user); 
						return; 
					}
					else {
						console.log("Error: could not login user "+username+": passwords do not match!"); 
						callback("Error: Wrong username or password!"); 
						return; 
					}
					callback(); 
				}).error(function(error){
					callback("Error: Wrong username or password!"); 
					console.log(error); 
				}); 
			}
		}
	});
}
