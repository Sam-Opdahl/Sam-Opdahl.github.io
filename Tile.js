
var TileLayer = {
	FOREGROUND: "Foreground",
	BACKGROUND: "Background",
	BACKGROUND2: "bg2"
};

//Holds the definitions for the types of tiles that can be used.
var TileType = {
	//represents a simple placeholder tile that has no functionality
	EMPTY: -1,
	//a regular block tile that provides simple collision detection
	BLOCK: 0,
	//a one way tile only handles collision on the top side of the tile,
	//if and only if the player is moving in the positive y direction
	ONE_WAY: 1,
	//a special tile type that represents water.
	//when a player collides with this, water physics take effect.
	WATER: 2,
	//allows the player to 'grab' the tile and climb it
	LADDER: 3,
	//causes damage to player if they touch it
	TOP_BOTTOM_SPIKE: 4,
	SIDE_SPIKE: 5,
};

//Represents x/y collision offsets for certain tile types.
//the key points to the specific TileType
var SpecialTileOffset = {
	3: [5, 0]
};


function Tile(tileType, tileSheetId, tileId, sourceX, sourceY, destX, destY, customHeight) {
	//specifies which type of tile this instance is.
	//special types of tiles provide extra functionality.
	//TileType holds all defined types of tiles
	this.tileType = tileType;
	//holds the id of the tile (sprite) sheet this tile instance came from.
	//used to pull the correct srite sheet for drawing
	this.tileSheetId = tileSheetId;
	//holds the Tiled tile id of this particular tile instance
	this.tileId = tileId;
	//holds the coordinates of the position of the tile to be drawn from the tile sheet.
	this.sourceX = sourceX;
	this.sourceY = sourceY;
	//holds the coordinates of where the tile will be drawn in the world.
	this.destX = destX
	this.destY = destY;

	//check if this tile has a custom collision height, otherwise set the default height
	this.height = customHeight == null ? Tile.size : customHeight;
}

Tile.prototype = {

	//the default tile size
	size: 16,

	//returns the regular collision box of a tile that the game entities can interact with
	getCollisionBox: function() {
		return new Rectangle(this.destX, this.destY, Tile.size, this.height);
	},

	//returns the collision box of the actual space taken up by this tile instance in its slot in the world.
	getRenderCollisionBox: function() {
		return new Rectangle(this.destX, this.destY, Tile.size, Tile.size);
	},

	//returns a special collision box based on the tile 'type' parameter
	getSpecialCollisionBox: function(type) {
		var offset = SpecialTileOffset[type];
		return new Rectangle(this.destX + offset[0],
				this.destY + offset[1],
				Tile.size - (offset[0] * 2),
				Tile.size - (offset[1] * 2))
	},

	//returns the center of the tile as a rectangle 1px in size
	getCenter: function() {
		return new Rectangle(this.destX + (Tile.size / 2), this.destY + (Tile.size / 2), 1, 1);
	},

	//returns whether this tile instance is active or not
	isActive: function() {
		return this.tileType != TileType.EMPTY;
	},

	update: function() {

	},

	//draw the tile if it is active.
	draw: function(context) {
		if (this.tileType == TileType.EMPTY) {
			return;
		}

		context.drawImage(AssetManager.getImage(this.tileSheetId), 
				this.sourceX, this.sourceY, this.size, this.size, 
				this.destX, this.destY, this.size, this.size);

		// if (this.tileType == TileType.LADDER ||
		// 	this.tileType == TileType.DOOR) {
		// 	context.fillStyle = "rgba(255,0,0,0.75)";
		// 	var r = this.getSpecialCollisionBox(this.tileType);
		// 	context.fillRect(r.x, r.y, r.width, r.height);		
		// }

		// context.fillStyle = "rgba(255,0,0,0.75)";
		// var r = this.getCollisionBox();
		// context.fillRect(r.x, r.y, r.width, r.height);	
	},
};


//Defines the types of animations that an AnimatedTile can use
var TileAnimation = {
	//the tile 'waves' back and forth between source tiles
	WAVE: "wave",
	//a simply animation that continually switches the source tile
	APPEAR: "appear",
	//Makes sources tiles fade between each other
	FADE: "fade"
};

//A child class of Tile, that provides the functionality to animate a tile.
function AnimatedTile(tileType, tileSheetId, tileId, sourceX, sourceY, destX, destY, customHeight, animType, tileFrames, speed) {
	Tile.call(this, tileType, tileSheetId, tileId, sourceX, sourceY, destX, destY, customHeight);
	this.animType = animType;
	this.tileFrames = tileFrames;

	//flag to tell us whether we're transition or not
	this.isTransitioning = false;
	//max wait time between transition
	this.maxTime = speed;
	this.counter = 0;
	//hold the original source x coordinate for animating
	this.originalSourceX = sourceX;

	//define special variables based on the type of animation
	switch (this.animType) {
		case TileAnimation.WAVE:
			//hold the max and current speed of the wave
			this.maxSpeed = 0.2;
			this.curSpeed = this.maxSpeed;
			//hold the acceleration rate when transitioning directions of the wave
			this.accel = 0.008;
			break;
		case TileAnimation.FADE:
			this.alpha = 1;
			this.fadeSpeed = 0.01;
			break;
	}
}

AnimatedTile.inheritsFrom(Tile);

AnimatedTile.prototype.update = function() {
	switch (this.animType) {
		//Wave animation update
		case TileAnimation.WAVE:
			if (!this.isTransitioning) {
				this.counter++;
				if (this.counter > this.maxTime) {
					//in this case, transitioning is simply reversing the wave's direction
					this.isTransitioning = true;
					this.counter = 0;
					//reverse the wave's direction
					this.maxSpeed *= -1;
					this.accel *= -1;
				}
			} else if (this.isTransitioning) {
				this.curSpeed += this.accel;
				//check if the wave has reached its max speed
				if (Math.abs(this.curSpeed) >= Math.abs(this.maxSpeed)) {
					//prevent the speed from going over the max and end the transition
					this.curSpeed = this.maxSpeed;
					this.isTransitioning = false;
				}
			}

			//update the wave's source image position
			this.sourceX += this.curSpeed;

			//keep the current source x position within the defined tile frame limit
			if (this.sourceX > this.originalSourceX + (Tile.size * this.tileFrames)) {
				this.sourceX = this.originalSourceX;
			} else if (this.sourceX < this.originalSourceX) {
				this.sourceX = this.originalSourceX + (Tile.size * this.tileFrames);
			}
			break;
		//Fade animation update
		case TileAnimation.FADE:
			//similar to the wave transition above
			if (!this.isTransitioning) {
				this.counter++;
				if (this.counter > this.maxTime) {
					this.counter = 0;
					this.isTransitioning = true;
					this.fadeSpeed *= -1;
				}
			} else {
				this.alpha += this.fadeSpeed;
				if (this.alpha <= 0 || this.alpha >= 1) {
					this.alpha = this.alpha.clamp(0, 1);
					this.isTransitioning = false;
				}
			}
			break;
		//appear animation update
		case TileAnimation.APPEAR:
			if (!this.isTransitioning) {
				this.counter++;
				if (this.counter > this.maxTime) {
					this.counter = 0;
					this.sourceX += Tile.size;
					if (this.sourceX >= this.originalSourceX + (Tile.size * (this.tileFrames + 1))) {
						this.sourceX = this.originalSourceX;
					}
				}
			}
			break;
	}
};

AnimatedTile.prototype.draw = function(context) {
	switch (this.animType) {
		case TileAnimation.WAVE:
		case TileAnimation.APPEAR:
			Tile.prototype.draw.call(this, context);
			break;
		case TileAnimation.FADE:
			context.save();

			//draw the main image with the current alpha value
			context.globalAlpha = this.alpha;
			Tile.prototype.draw.call(this, context);

			//draw the secondary transitional image with an inversed alpha value
			context.globalAlpha = 1 - this.alpha;
			context.drawImage(AssetManager.getImage(this.tileSheetId), 
				this.sourceX + Tile.size, this.sourceY, this.size, this.size, 
				this.destX, this.destY, this.size, this.size);

			context.restore();
			break;
	}
};