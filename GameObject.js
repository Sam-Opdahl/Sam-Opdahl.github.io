
var ObjectType = {
	DOOR: "door",
	ITEM: "item"
};

var ObjectOffset = {
	"door": [5, 0]
}


function GameObject(objectType, value, tileSheetId, sourceX, sourceY, destX, destY, size) {
	this.objectType = objectType;
	this.value = value;
	this.tileSheetId = tileSheetId;
	this.sourceX = sourceX;
	this.sourceY = sourceY;
	this.destX = destX
	this.destY = destY;
	this.isActive = true;
	this.size = size;
}

GameObject.prototype = {
	getCollisionBox: function() {
		return new Rectangle(this.destX, this.destY, this.size, this.size);
	},

	getSpecialCollisionBox: function(type) {
		var offset = ObjectOffset[type];
		return new Rectangle(this.destX + offset[0],
				this.destY + offset[1],
				this.size - (offset[0] * 2),
				this.size - (offset[1] * 2))
	},

	getCenter: function() {
		return new Rectangle(this.destX + (this.size / 2), this.destY + (this.size / 2), 1, 1);
	},

	update: function() { },

	draw: function(context) {
		if (!this.isActive) {
			return;
		}

		context.drawImage(AssetManager.getImage(this.tileSheetId), 
				this.sourceX, this.sourceY, this.size, this.size, 
				this.destX, this.destY, this.size, this.size);

		// if (this.objectType == ObjectType.DOOR) {
		// 	context.fillStyle = "rgba(255,0,0,0.75)";
		// 	var r = this.getSpecialCollisionBox(this.objectType);
		// 	context.fillRect(r.x, r.y, r.width, r.height);		
		// }
	},
};



function AnimatedGameObject(objectType, value, tileSheetId, sourceX, sourceY, destX, destY, size, animTimes) {
	GameObject.call(this, objectType, value, tileSheetId, sourceX, sourceY, destX, destY, size);
	this.animTimes = animTimes;
	this.frameCount = this.animTimes.length;
	this.currentFrame = 0;
	this.counter = 0;
}

AnimatedGameObject.inheritsFrom(GameObject);

AnimatedGameObject.prototype.update = function() {
	if (!this.isActive) {
		return;
	}

	if (++this.counter > this.animTimes[this.currentFrame]) {
		this.counter = 0;
		if (++this.currentFrame >= this.frameCount) {
			this.currentFrame = 0;
		}
	}
};

AnimatedGameObject.prototype.draw = function(context) {
	if (!this.isActive) {
		return;
	}

	context.drawImage(AssetManager.getImage(this.tileSheetId), 
			this.sourceX + (this.size * this.currentFrame), this.sourceY, this.size, this.size, 
			this.destX, this.destY, this.size, this.size);
}