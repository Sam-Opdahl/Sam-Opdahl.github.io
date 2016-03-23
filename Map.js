var LayerType = {
	TILE: "tilelayer",
	OBJECT: "objectgroup"
};

var LayerName = {
	ENEMY_LAYER: "enemy_layer"
};

function Map(world) {
	this.world = world;
	this.currentMap = -1;
	this.mapIsLoaded = false;

	//hold static foreground/background tiles repectively
	this.foregroundTiles = [];
	this.backgroundTiles = [];
	//animatedTiles will hold both foreground and background tiles,
	//and animatedBgTiles will hold strictly background level 2 tiles
	//to help make the draw order of animated tiles correct when drawing in the world.
	this.animatedTiles = [];
	this.animatedBgTiles = [];

	this.doorObjects = [];
	this.startPositions = [];
	this.items = [];

	this.activeEnemies = [];
	this.inactiveEnemies = [];

	this.backgrounds = [];
	this.bgParallax = [];

	//create new canvases which will hold a pre-render of the static tiles.
	//This way, only two draw calls will be needed to draw all static tiles, which gives a nice performance boost.
	this.foregroundCanvas = document.createElement("canvas");
	this.backgroundCanvas = document.createElement("canvas");
	this.foregroundContext;
	this.backgroundContext;

	this.previousTileAnimateSpeed = null;
}

Map.prototype = {

	loadMap: function(mapId) {
		//make sure the tile map file is loaded before attempting to generate it.
		if (typeof(TileMaps[mapId.toString()]) === "undefined") {
			alert("Tile map " + mapId + " is non-existant");
			return;
		} 

		this.currentMap = mapId.toString();
		this.mapData = TileMaps[this.currentMap];
		Tile.size = this.mapData.tilewidth;

		if (typeof(this.mapData.properties.bg) !== "undefined") {
			var bg = this.mapData.properties.bg.split(",");

			for (var i = 0; i < bg.length; i++) {
				try {
					AssetManager.getImage(bg[i]);
				} catch (e) { 
					continue;
				}
				this.backgrounds.push(bg[i]);
			}
			this.bgParallax = this.mapData.properties.bgp.split(",");
		}

		if (typeof(this.mapData.properties.diamond) !== "undefined") {
			this.world.diamondSubMapId = parseInt(this.mapData.properties.diamond);
		} else {
			if (mapId.endsWith("0")) {
				console.log("warning: no diamond defined for this level!");
			}
		}

		this.foregroundCanvas.width = this.backgroundCanvas.width = this.mapData.width * this.mapData.tilewidth;
		this.foregroundCanvas.height = this.backgroundCanvas.height = this.mapData.height * this.mapData.tileheight;
		this.foregroundContext = this.foregroundCanvas.getContext("2d");
		this.backgroundContext = this.backgroundCanvas.getContext("2d");

		for (var i = 0; i < this.mapData.height; i++) {
			this.foregroundTiles[i] = new Array(this.mapData.width);
		}

		for (var l in this.mapData.layers) {
			var layer = this.mapData.layers[l];	

			if (layer.type == LayerType.TILE) {
				for (var i = 0; i < layer.data.length; i++) {

					var destX = (i % this.mapData.width);
					var destY = Math.floor(i / this.mapData.width);

					if (layer.data[i] == 0) {
						this.addTileToMap(destX, destY, layer.name, new Tile(TileType.EMPTY, null, null, null, null, destX * Tile.size, destY * Tile.size, null))
						continue;
					}

					var sourceSetId = this.getTileSource(layer.data[i])
					var sourceSet = this.mapData.tilesets[sourceSetId];
					var rowLength = sourceSet.imagewidth / Tile.size;
					var tileSheetLocation = layer.data[i] - sourceSet.firstgid;
					var sourceX = (tileSheetLocation % rowLength) * Tile.size;
					var sourceY = Math.floor((tileSheetLocation + 1) / rowLength) * Tile.size;
					var sourceImageId = this.mapData.tilesets[sourceSetId].properties.id;

					var tileType = TileType.BLOCK;
					var animation = null;
					var tileFrames = null;
					var speed = null;
					var customHeight = null;
					if (typeof(sourceSet.tileproperties) !== "undefined") {
						var tileProperties = sourceSet.tileproperties[tileSheetLocation];
						if (typeof(tileProperties) !== "undefined") {
							if (typeof(tileProperties.tiletype) !== "undefined") {
								tileType = parseInt(tileProperties.tiletype);
							}
							if (typeof(tileProperties.animate) !== "undefined") {
								animation = tileProperties.animate;
								tileFrames = parseInt(tileProperties.frames);
								if (typeof(tileProperties.speed) !== "undefined") {
									speed = tileProperties.speed;
								}
							}
							if (typeof(tileProperties.height) !== "undefined") {
								customHeight = parseInt(tileProperties.height);
							}
						}
					}

					if (animation == null) {
						this.previousTileAnimateSpeed = null;
						this.addTileToMap(destX, destY, layer.name, new Tile(tileType, sourceImageId, layer.data[i], sourceX, sourceY, destX * Tile.size, destY * Tile.size, customHeight));
					} else {
						if (animation == TileAnimation.WAVE || animation == TileAnimation.FADE) {
							if (this.previousTileAnimateSpeed != null) {
								speed = this.previousTileAnimateSpeed;
							} else {
								speed = (animation == TileAnimation.WAVE) ? rand(65, 90) : rand(10, 20);
								this.previousTileAnimateSpeed = speed;
							}
						} else {
							if (speed != null) {
								var speedRange = $.map(speed.split(","), Number);
								speed = rand(speedRange[0], speedRange[1]);
							} else {
								speed = rand(4,6);
								console.log("warning: default speed applied to APPEAR transition in " + mapId);
							}
						}

						var tile = new AnimatedTile(tileType, sourceImageId, layer.data[i], sourceX, sourceY, destX * Tile.size, destY * Tile.size, customHeight, animation, tileFrames, speed);
						if (layer.name == TileLayer.FOREGROUND) {
							this.addTileToMap(destX, destY, layer.name, tile);
						}

						if (layer.name == TileLayer.BACKGROUND2) {
							this.animatedBgTiles.push(tile);
						} else {
							this.animatedTiles.push(tile);
						}
					}
				}
			} else if (layer.type == LayerType.OBJECT) {
				var itemId = 0;
				for (var i = 0; i < layer.objects.length; i++) {
					var obj = layer.objects[i];

					var sourceSetId = this.getTileSource(obj.gid);
					var sourceSet = this.mapData.tilesets[sourceSetId];
					var rowLength = sourceSet.imagewidth / sourceSet.tilewidth;
					var tileSheetLocation = obj.gid - sourceSet.firstgid;
					var sourceX = (tileSheetLocation % rowLength) * sourceSet.tilewidth;
					var sourceY = Math.floor((tileSheetLocation + 1) / rowLength) * sourceSet.tileheight;
					var sourceImageId = this.mapData.tilesets[sourceSetId].properties.id;

					switch (obj.type) {
						case "door":
							this.doorObjects.push(new GameObject(obj.type, obj.name, sourceImageId, sourceX, sourceY, Math.round(obj.x), Math.round(obj.y - sourceSet.tilewidth), sourceSet.tilewidth));
							break;
						case "start":
							this.startPositions.push(new GameObject(obj.type, obj.name, sourceImageId, sourceX, sourceY, Math.round(obj.x), Math.round(obj.y - Tile.size)));
							break;
						case "enemy":
							this.inactiveEnemies.push(new Enemy(this.world, obj.name, Math.round(obj.x + (Tile.size / 2)), Math.round(obj.y), obj.properties.distance));
							break;
						case "item":						
							var formattedId = this.formatItemId(itemId);
							if (typeof(this.world.collectedItems[formattedId]) === "undefined") {
								var animTimes = sourceSet.tileproperties[tileSheetLocation].obj_anim;
								//check if the individual object on the map has a unique value. if not, attempt to give it a default value from the tileproperties. if no value found, it will be left blank.
								var value = (obj.name != "" ? obj.name : (typeof(sourceSet.tileproperties[tileSheetLocation].val) !== "undefined" ? sourceSet.tileproperties[tileSheetLocation].val : ""));

								if (typeof(animTimes) === "undefined") {
									this.items[formattedId] = new GameObject(obj.type, value, sourceImageId, sourceX, sourceY, Math.round(obj.x), Math.round(obj.y - sourceSet.tileheight), sourceSet.tilewidth);
								} else {
									this.items[formattedId] = new AnimatedGameObject(obj.type, value, sourceImageId, sourceX, sourceY, 
										Math.round(obj.x), Math.round(obj.y - sourceSet.tileheight), sourceSet.tilewidth, $.map(animTimes.split(","), Number));
								}
								if (this.items[formattedId].value.toString() == Constants.SPECIAL_ITEM_BLK_DIAMOND) {
									if (!this.world.blackDiamondShown) {
										this.items[formattedId].isActive = false;
									}
								}
							}
							itemId++;
							break;
						default:
							break;
					}
				}
			}
		}

		this.renderStaticForeground();
		this.renderStaticBackground();

		this.mapIsLoaded = true;
	},

	formatItemId: function(id) {
		return this.currentMap + "-" + id; 
	},

	getTileSource: function(tileSrc) {
		for (var i = this.mapData.tilesets.length - 1; i >= 0; i--) {
			if (tileSrc >= this.mapData.tilesets[i].firstgid) {
				return i;
			}
		}
	},

	addTileToMap: function(x, y, layer, tile) {
		if (layer == TileLayer.FOREGROUND) {
			this.foregroundTiles[y][x] = tile;
		} else {
			this.backgroundTiles.push(tile);
		}
	},

	getStartPosition: function(fromMap) {
		for (var i = 0; i < this.startPositions.length; i++) {
			var pos = this.startPositions[i];
			if (pos.value == fromMap) {
				return [pos.destX, pos.destY - 8];
			}
		}

		return [-1, -1];
	},

	getPixelWidth: function() {
		return this.mapData.width * this.mapData.tilewidth;
	},

	getPixelHeight: function() {
		return this.mapData.height * this.mapData.tileheight;
	},

	spawnInitialEnemies: function() {
		//if we are re-spawning the initial enemies a second time for some reason,
		//remove the first set of active enemies that may no longer be relevant.
		for (var i = this.activeEnemies.length - 1; i >= 0; i--) {
			this.removeActiveEnemy(i);
		}

		for (var i = this.inactiveEnemies.length - 1; i >= 0; i--) {
			var enemy = this.inactiveEnemies[i];

			enemy.prevIntersectsSpawn = enemy.intersectsSpawn;
			enemy.intersectsSpawn = enemy.getSpawnRect().intersects(this.world.camera.getEnemySpawnRect());

			if (enemy.intersectsSpawn) {
				this.inactiveEnemies.splice(i, 1);
				enemy.reset();
				this.activeEnemies.push(enemy);
			}
		}
	},

	update: function() {
		this.updateScenery();
		this.updateActiveEnemies();
	},

	updateScenery: function() {
		this.updateAnimatedTiles();
		this.updateObjects();
	},

	updateActiveEnemies: function() {
		for (var i = this.inactiveEnemies.length - 1; i >= 0; i--) {
			var enemy = this.inactiveEnemies[i];
			var r = enemy.getSpawnRect();

			//these flags tell us whether the enemy's spawn point intersects with the spawn area.
			//prevIntersectsSpawn will tell us whether spawn area has moved off the enemy's spawn point since its last spawn.
			//this will prevent an enemy from respawning after it disappeared and the player hasn't moved
			enemy.prevIntersectsSpawn = enemy.intersectsSpawn;
			enemy.intersectsSpawn = r.intersects(this.world.camera.getEnemySpawnRect()) && 
				!r.intersects(this.world.camera.getEnemyIgnoreRect());

			if (enemy.intersectsSpawn && !enemy.prevIntersectsSpawn) {
				//check which side of the player the enemy is suppose to spawn on
				//only let the enemy spawn if the player is moving toward it
				var distToPlayer = enemy.startX - this.world.player.x;
				if (distToPlayer > 0) {
					if (this.world.player.xCurSpeed <= 0) {
						continue;
					}
				} else if (distToPlayer < 0) {
					if (this.world.player.xCurSpeed >= 0) {
						continue;
					}
				}

				//spawn the enemy!
				this.inactiveEnemies.splice(i, 1);
				enemy.reset();
				this.activeEnemies.push(enemy);
			}
		}


		for (var i = this.activeEnemies.length - 1; i >= 0; i--) {
			//check if the enemy has moved off the play area. if so, set as inactive
			if (!this.activeEnemies[i].getCollisionRect().intersects(this.world.camera.getEnemySpawnRect()) && 
				!this.activeEnemies[i].getSpawnRect().intersects(this.world.camera.getEnemySpawnRect())) {
				this.removeActiveEnemy(i);
				continue;
			}

			this.activeEnemies[i].update();
		}
	},

	removeActiveEnemy: function(index) {
		var enemy = this.activeEnemies.splice(index, 1)[0];
		this.inactiveEnemies.push(enemy);
	},

	updateObjects: function() {
		for (var i in this.items) {
			if (this.items[i] instanceof AnimatedGameObject) {
				this.items[i].update();
			}
		}
	},

	updateAnimatedTiles: function() {
		var cameraCb = this.world.camera.getCollisionRect();

		for (var i = 0; i < this.animatedTiles.length; i++) {
			this.animatedTiles[i].update();
		}
		for (var i = 0; i < this.animatedBgTiles.length; i++) {
			this.animatedBgTiles[i].update();
		}
	},

	renderStaticForeground: function() {
		for (var y = 0; y < this.foregroundTiles.length; y++) {
			for (var x = 0; x < this.foregroundTiles[0].length; x++) {
				if (this.foregroundTiles[y][x] instanceof AnimatedTile) {
					continue;
				}
				this.foregroundTiles[y][x].draw(this.foregroundContext);
			}
		}
	},

	renderStaticBackground: function() {
		for (var i = 0; i < this.backgroundTiles.length; i++) {
			if (this.backgroundTiles[i] instanceof AnimatedTile) {
				continue;
			}
			this.backgroundTiles[i].draw(this.backgroundContext);
		}
	},

	drawDynamicTiles: function(context) {
		var cameraCb = this.world.camera.getCollisionRect();

		for (var i = 0; i < this.animatedTiles.length; i++) {
			if (this.animatedTiles[i].getRenderCollisionBox().intersects(cameraCb)) {
				this.animatedTiles[i].draw(context);
			}
		}
	},

	drawDynamicBgTiles: function(context) {
		var cameraCb = this.world.camera.getCollisionRect();

		for (var i = 0; i < this.animatedBgTiles.length; i++) {
			if (this.animatedBgTiles[i].getRenderCollisionBox().intersects(cameraCb)) {
				this.animatedBgTiles[i].draw(context);
			}
		}
	},

	drawGameObjects: function(context) {
		var cameraCb = this.world.camera.getCollisionRect();
		for (var i = 0; i < this.doorObjects.length; i++) {
			if (this.doorObjects[i].getCollisionBox().intersects(cameraCb)) {
				this.doorObjects[i].draw(context);
			}
		}
		
		for (var i = 0; i < this.activeEnemies.length; i++) {
			this.activeEnemies[i].draw(context);
		}

		for (var key in this.items) {
			if (this.items[key].getCollisionBox().intersects(cameraCb)) {
				this.items[key].draw(context);
			}
		}
	}
};