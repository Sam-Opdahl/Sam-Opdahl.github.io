
var TravelType = {
	FLYING: 0,
	WALKING: 1
};

//dim[0] = animation rectangle, 
//dim[1] = collision rectangle offset, 
//dim[2] = # of animation frames,
//dim[3] = frame time
//dim[4] = movement speed
//dim[5] = tile set
//dim[6] = enemy type
var dim = {
	1: [new Rectangle(219, 235, 34, 29), [11, 1], 2, 13, 0.75, 11, TravelType.WALKING],
	2: [new Rectangle(400, 192, 24, 16), [0, 0], 2, 8, 1.2, 0, TravelType.FLYING],
	3: [new Rectangle(400, 224, 16, 16), [0, 0], 2, 8, 0.8, 0, TravelType.FLYING]
};

function Enemy(world, type, x, y, dist) {
	this.animDimension = dim[type][0];
	this.collisionOffset = dim[type][1];

	this.world = world;
	this.type = type;
	this.srcSet = dim[type][5];
	this.travelType = dim[type][6];

	this.startX = x - (this.animDimension.width / 2);
	this.startY = Math.round(y - this.animDimension.height);
	this.x;
	this.y;
	this.speed = dim[type][4];
	this.walkDistance = dist;
	this.hasWalkDistance = typeof(dist) !== "undefined";

	this.intersectsSpawn = false;
	this.prevIntersectsSpawn = false;

	this.direction;

	this.animation = new Animation(this.animDimension.x, this.animDimension.y, this.animDimension.width, this.animDimension.height, dim[type][2], dim[type][3], this.direction);
}

Enemy.prototype = {

	getSpawnRect: function() {
		return new Rectangle(this.startX + this.collisionOffset[0], 
			this.startY + this.collisionOffset[1], 
			this.animDimension.width - (this.collisionOffset[0] * 2), 
			this.animDimension.height - this.collisionOffset[1]);
	},

	getCollisionRect: function() {
		return new Rectangle(this.x + this.collisionOffset[0], 
			this.y + this.collisionOffset[1], 
			this.animDimension.width - (this.collisionOffset[0] * 2), 
			this.animDimension.height - this.collisionOffset[1]);
	},

	getJumpCollisionRect: function() {
		return new Rectangle(this.x + this.collisionOffset[0], 
			this.y + this.collisionOffset[1], 
			this.animDimension.width - (this.collisionOffset[0] * 2), 
			this.animDimension.height - this.collisionOffset[1]);
	},

	jumpCutoff: 2,
	getJumpCutoffRect: function() {
		var r = this.getCollisionRect();
		return new Rectangle(r.x, r.y + this.jumpCutoff, r.width, r.height - this.jumpCutoff);
	},

	getBottomDetectRect: function() {
		var rect = this.getCollisionRect();
		var x = this.direction == AnimDir.RIGHT ? rect.x + rect.width + 1 : rect.x - rect.width - 1;
		return new Rectangle(x, rect.y + rect.height, rect.width, 1);
	},

	reset: function() {
		this.x = this.startX;
		this.y = this.startY;

		var relativePos = this.world.player.x - this.x
		this.direction = relativePos >= 0 ? AnimDir.RIGHT : AnimDir.LEFT;
		this.animation.reset();
	},

	update: function() {
		this.x += this.speed * this.direction;

		this.checkMapBounds();
		this.checkWalkDistance();
		this.checkTileCollisions();
		if (this.travelType == TravelType.WALKING) {
			this.checkEdgeCollisions();
		}

		this.animation.update(this.direction);
	},

	checkEdgeCollisions: function() {
		var intersects = false;
		var columns = this.getIntersectingColumns();
		var startY = this.getLowBoundTile(this.getCollisionRect().bottom);
		var fallDetectRect = this.getBottomDetectRect();
		var map = this.world.getCurrentMap();

		if (!(startY >= map.mapData.height || startY < 0)) {
			for (var i = 0; i < columns.length; i++) {
				if (columns[i] >= map.mapData.width || columns[i] < 0) {
					continue;
				}
				var curTile = map.foregroundTiles[startY][columns[i]];
				if (curTile.isActive() && curTile.tileType != TileType.WATER) {
					if (fallDetectRect.intersects(curTile.getCollisionBox())) {
						intersects = true;
						break;
					}
				}
			}
		}

		if (!intersects) {
			this.direction *= -1;
		}
	},

	checkMapBounds: function() {
		var cr = this.getCollisionRect();
		if (cr.x < 0) {
			this.x = -this.collisionOffset[0];
			this.direction = AnimDir.RIGHT;
		}
		
		if (cr.x + cr.width > this.world.getCurrentMap().getPixelWidth()) {
			this.x = this.world.getCurrentMap().getPixelWidth() - cr.width - this.collisionOffset[0];
			this.direction = AnimDir.LEFT
		}
	},

	checkWalkDistance: function() {
		if (this.hasWalkDistance) {
			if (this.x - this.startX > this.walkDistance) {
				this.direction = AnimDir.LEFT;
			} else if (this.x - this.startX < -this.walkDistance) {
				this.direction = AnimDir.RIGHT;
			}
		}
	},

	checkTileCollisions: function() {
		//check tile collisions
		var hitTile = this.sideCollision(this.world.getCurrentMap(), this.getUpperBoundTile(this.getCollisionRect().right) - 1);
		if (hitTile != null) {
			var collisionBox = hitTile.getCollisionBox();
			this.direction *= -1;
			this.x = collisionBox.left - this.getCollisionRect().width - this.collisionOffset[0];
		}

		hitTile = this.sideCollision(this.world.getCurrentMap(), this.getLowBoundTile(this.getCollisionRect().left));
		if (hitTile != null) {
			var collisionBox = hitTile.getCollisionBox();
			this.direction *= -1;
			this.x = collisionBox.right - this.collisionOffset[0];
		}
	},

	sideCollision: function(map, position) {
		var rows = this.getIntersectingRows();

		for (var i = 0; i < rows.length; i++) {
			if (rows[i] >= map.mapData.height || rows[i] < 0 ||
				position >= map.mapData.width || position < 0) {
				continue;
			}

			var tile = map.foregroundTiles[rows[i]][position];
			if (tile.isActive()) {
				if (tile.tileType == TileType.ONE_WAY ||
					tile.tileType == TileType.WATER ||
					tile.tileType == TileType.LADDER) {
					continue;
				}

				if (this.getCollisionRect().intersects(tile.getCollisionBox())) {
					return tile;
				}
			}
		}

		return null;
	},

	getIntersectingRows: function() {
		return this.getIntersectList(this.getCollisionRect().top, this.getCollisionRect().bottom);
	},

	getIntersectingColumns: function() {
		return this.getIntersectList(this.getBottomDetectRect().left, this.getBottomDetectRect().right);
	},

	getLowBoundTile: function(bound) {
		return Math.floor(bound / Tile.size);
	},

	getUpperBoundTile: function(bound) {
		return Math.ceil(bound / Tile.size);
	},

	getIntersectList: function(start, end) {
		start = this.getLowBoundTile(start);
		end = this.getUpperBoundTile(end);

		var list = [];
		for (var i = 0; i < end - start; i++) {
			list[i] = start + i;
		}

		return list;
	},
	
	draw: function(context) {
		var src = this.animation.getAnimRect();
		context.drawImage(AssetManager.getImage(this.srcSet), src.x, src.y, src.width, src.height, Math.round(this.x), this.y, src.width, src.height);

		// context.fillStyle = "rgba(255,0,0,1)";
		// var r = this.getBottomDetectRect();
		// context.fillRect(Math.round(r.x), r.y, r.width, r.height);
	}
};