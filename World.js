
// World class ------------------------------------------------------------------------------------------------------------

function World(gameScreen, currentWorld) {
	this.gameScreen = gameScreen;
	this.worldId = currentWorld;
	this.mapId;
	this.currentMap;
	this.player;
	this.camera;

	this.collectedItems = {};
	this.coinTotal = 0;
	this.specialItemsCollected = {};

	this.diamondSubMapId;
	this.diamondSubMap = null;
	this.blackDiamondUnlocked = false;
	this.blackDiamondObject = null;
	this.findDiamondTransition = null;
	this.diamondCounter = 0;

	this.isTransitioningOffMap = false;
	this.isTransitioningOnMap = false;
	this.mapTransitionRect;
	this.transitionAlpha;
	this.mapTransitionId;

	this.transition = null;
	this.finalDoorOpened = false;

	this.initialize();
}

World.prototype = {

	initialize: function() {
		this.loadMap(0);

		var startPos = this.currentMap.getStartPosition(0);
		this.player = new Player(this, startPos[0], startPos[1]);
		this.camera = new Camera(this);

		this.camera.update();
		this.getCurrentMap().spawnInitialEnemies();
	},

	setStartPos: function(startId) {
		var pos = this.currentMap.getStartPosition(startId);
		this.player.x = pos[0];
		this.player.y = pos[1];

		this.camera.update();
		this.getCurrentMap().spawnInitialEnemies();
	},

	update: function(screenNotTransitioning) {
		if (this.transition != null) {
			this.transition.update();
			if (this.transition.isComplete()) {
				if (this.transition.state == TransitionState.OUT) {
					this.loadMap(this.mapTransitionId);
					var startPos = this.getCurrentMap().getStartPosition(this.previousMapId);
					this.player.x = startPos[0];
					this.player.y = startPos[1];
					this.player.setStartValues();
					this.camera.update();
					this.getCurrentMap().spawnInitialEnemies();

					this.transition = new Transition(TransitionState.IN, TransitionType.FADE, 0.01, null);
				} else {
					this.transition = null;
				}
			}
		}

		if (this.findDiamondTransition == null) {
			this.player.update(this.getCurrentMap(), screenNotTransitioning && (this.transition == null || (this.transition != null && this.transition.state == TransitionState.IN)));
			if (this.finalDoorOpened) {
				this.getCurrentMap().updateScenery();
			} else {
				this.getCurrentMap().update();
			}
			this.camera.update();
		} else {
			this.findDiamondTransition.update();
			if (this.findDiamondTransition.isComplete()) {
				if (this.findDiamondTransition.state == TransitionState.OUT) {
					if (!this.blackDiamondShown) {
						var diamondCenter = this.blackDiamondObject.getCenter();
						this.camera.setManualCoordinates(diamondCenter.x, diamondCenter.y, this.diamondSubMap == null ? this.getCurrentMap() : this.diamondSubMap);
						if (this.diamondSubMap != null) {
							this.diamondSubMap.spawnInitialEnemies();
						}
						this.findDiamondTransition = new Transition(TransitionState.IN, TransitionType.FADE, 0.01, null);
						this.diamondCounter = 0;
					} else {
						this.findDiamondTransition = new Transition(TransitionState.IN, TransitionType.FADE, 0.01, null);
						this.camera.update();
					}
				} else if (this.findDiamondTransition.state == TransitionState.IN) {
					if (!this.blackDiamondShown) {
						this.blackDiamondObject.isActive = true;
						if (this.diamondCounter++ > Constants.MAX_DIAMOND_VIEW_TIME) {
							this.findDiamondTransition = new Transition(TransitionState.OUT, TransitionType.FADE, 0.01, null);
							this.blackDiamondShown = true;
						}
					} else {
						this.findDiamondTransition = null;
						this.diamondSubMap = null;
					}
				}
			}
			var map = this.isShowingSubMap() ? this.diamondSubMap : this.getCurrentMap();
			map.updateScenery();
		}	
	},

	draw: function(context) {
		var map = this.isShowingSubMap() ? this.diamondSubMap : this.getCurrentMap();

		if (map.backgrounds.length > 0) {
			for (var i = 0; i < map.backgrounds.length; i++) {
				var img = AssetManager.getImage(map.backgrounds[i]);
				var x = (this.camera.x * map.bgParallax[i]) % img.width;
				while (x < CANVAS_WIDTH) {
					context.drawImage(img, x, 0, img.width, CANVAS_HEIGHT);
					x += img.width - 1;
				}
			}
		} else {
			context.fillStyle = "black";
			context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		}

		this.camera.translate(context);

		map.drawDynamicBgTiles(context);
		context.drawImage(map.backgroundCanvas, 0, 0);
		map.drawDynamicTiles(context);
		context.drawImage(map.foregroundCanvas, 0, 0);

		map.drawGameObjects(context);
		if (!this.isShowingSubMap()) {
			this.player.draw(context);
		}

		if (this.transition != null && this.transition.transitionType == TransitionType.ZOOM) {
			this.transition.draw(context);
		}

		this.camera.restore(context);

		if (this.transition != null && this.transition.transitionType == TransitionType.FADE) {
			this.transition.draw(context);
		}

		if (this.findDiamondTransition != null && this.findDiamondTransition.transitionType == TransitionType.FADE) {
			this.findDiamondTransition.draw(context);
		}

		//Draw health bar
		var img = AssetManager.getImage(ImageAsset.health_0 + this.player.health);
		context.drawImage(img, 5, 5, img.width-27, img.height-9);

		if (!(this instanceof HomeWorld)) {
			var x = CANVAS_WIDTH - 55;
			context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 88, 400, 8, 8, x, 5, 8, 8);
			context.font = "12px Verdana";
			context.fillStyle = "black";
			context.fillText("x " + this.coinTotal, x + 12, 13);

			context.fillStyle = "white";
			context.fillText("x " + this.coinTotal, x + 10, 12);

			if (this.specialItemsCollected[Constants.SPECIAL_ITEM_SAPPHIRE]) {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 128, 864, 16, 16, x, 15, 16, 16);
			} else {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 144, 880, 16, 16, x, 15, 16, 16);
			}
			x += 17;
			if (this.specialItemsCollected[Constants.SPECIAL_ITEM_EMERALD]) {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 128, 848, 16, 16, x, 15, 16, 16);
			} else {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 128, 880, 16, 16, x, 15, 16, 16);
			}
			x += 17;
			if (this.specialItemsCollected[Constants.SPECIAL_ITEM_RUBY]) {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 112, 832, 16, 16, x, 15, 16, 16);
			} else {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 112, 880, 16, 16, x, 15, 16, 16);
			}
			x -= 51;
			if (this.specialItemsCollected[Constants.SPECIAL_ITEM_BLK_DIAMOND]) {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 112, 896, 16, 16, x, 15, 16, 16);
			}
		}
	},

	loadMap: function(mapId) {
		this.mapId = mapId;
		this.currentMap = new Map(this);
		this.currentMap.loadMap(this.formatMapId());
	},

	getCurrentMap: function() {
		return this.currentMap;
	},

	transitionToMap: function(door) {
		//check whether this door leads back to the home world or to a different area of the level.
		if (door.value.indexOf(HOME_WORLD_PREFIX) == -1) {
			this.previousMapId = this.mapId;
			this.mapTransitionId = door.value;
			this.transition = new Transition(TransitionState.OUT, TransitionType.ZOOM, 4, door.getCenter());
			this.player.xCurSpeed = 0;
		} else {
			this.finalDoorOpened = true;
			if (typeof(this.specialItemsCollected[Constants.SPECIAL_ITEM_SAPPHIRE]) !== "undefined") {
				localStorage.setItem(Constants.SPECIAL_ITEM_SAPPHIRE + this.worldId, 1);
			}
			if (typeof(this.specialItemsCollected[Constants.SPECIAL_ITEM_EMERALD]) !== "undefined") {
				localStorage.setItem(Constants.SPECIAL_ITEM_EMERALD + this.worldId, 1);
			}
			if (typeof(this.specialItemsCollected[Constants.SPECIAL_ITEM_RUBY]) !== "undefined") {
				localStorage.setItem(Constants.SPECIAL_ITEM_RUBY + this.worldId, 1);
			}
			if (typeof(this.specialItemsCollected[Constants.SPECIAL_ITEM_BLK_DIAMOND]) !== "undefined") {
				localStorage.setItem(Constants.SPECIAL_ITEM_BLK_DIAMOND + this.worldId, 1);
			}

			localStorage.setItem(Constants.LEVEL_PASSED_ID + this.worldId.toString(), 1);

			var key = Constants.COIN_TOTAL_INDENTIFIER + this.worldId;
			if (typeof(localStorage[key]) === "undefined" || localStorage[key] < this.coinTotal) {
				localStorage.setItem(key, this.coinTotal);
			}

			this.transitionToHomeWorld(door.value, this.worldId);
		}
	},

	transitionToHomeWorld: function(id, startPos) {
		this.gameScreen.goToWorld(id, startPos);
	},

	formatMapId: function() {
		return this.worldId + "-" + this.mapId;
	},

	//Event for when the player collects a new items.
	onCollectItem: function(key) {
		var map = this.getCurrentMap();
		var val = map.items[key].value.toString();
		if (val.startsWith(Constants.COIN_IDENTIFIER)) {
			this.coinTotal += parseInt(val.substring(Constants.COIN_IDENTIFIER.length));

			if (this.coinTotal >= Constants.BLACK_DIAMOND_UNLOCK && !this.blackDiamondUnlocked) {
				//black diamond is located on current map
				if (this.diamondSubMapId == this.mapId) {
					this.blackDiamondUnlocked = true;
					for (var i in map.items) {
						if (map.items[i].value.toString() == Constants.SPECIAL_ITEM_BLK_DIAMOND) {
							this.blackDiamondObject = map.items[i];
							break;
						}
					}
					this.findDiamondTransition = new Transition(TransitionState.OUT, TransitionType.FADE, 0.01, null);
				//black diamond is located on another map. Load the other map to show a view of the diamond.
				} else {
					this.blackDiamondUnlocked = true;
					this.diamondSubMap = new Map(this);
					this.diamondSubMap.loadMap(this.worldId + "-" + this.diamondSubMapId);

					for (var i in this.diamondSubMap.items) {
						if (this.diamondSubMap.items[i].value.toString() == Constants.SPECIAL_ITEM_BLK_DIAMOND) {
							this.blackDiamondObject = this.diamondSubMap.items[i];
							break;
						}
					}
					this.findDiamondTransition = new Transition(TransitionState.OUT, TransitionType.FADE, 0.01, null);
				}
			}
		} else {
			this.specialItemsCollected[val] = true;
		}

		this.collectedItems[key] = map.items[key];
		delete map.items[key];
	},

	isShowingSubMap: function() {
		return (this.diamondSubMap != null && this.findDiamondTransition.state == TransitionState.IN && !this.blackDiamondShown) ||
			(this.diamondSubMap != null && this.findDiamondTransition.state == TransitionState.OUT && this.blackDiamondShown);
	},

	getSavedCoinTotal: function(level) {
		var key = Constants.COIN_TOTAL_INDENTIFIER + level;
		return typeof(localStorage[key]) === "undefined" ? 0 : localStorage[key];
	},

	getSavedSpecialItemTotal: function() {
		var total = 0;
		for (var key in localStorage) {
			if (key.startsWith(Constants.SPECIAL_IDENTIFIER)) {
				if (localStorage.hasOwnProperty(key)) {
					if (localStorage[key] == 1) {
						total++;
					}
				}
			}
		}
		return total;
	},

	displayDoorInformation: function(door) { }
};


// HomeWorld class ------------------------------------------------------------------------------------------------------------

var DOOR_POPUP_COLOR = new Color(0, 0, 0, 0.7);
var DOOR_POPUP_WIDTH = 55;
var DOOR_POPUP_HEIGHT = 80;
var DOOR_POPUP_TOP_MARGIN = 10;
var DOOR_POPUP_X = CANVAS_WIDTH / 2 - DOOR_POPUP_WIDTH;

var HomeWorld = function(gameScreen, currentWorld) {
	World.call(this, gameScreen, currentWorld);

	this.doorInfoToDisplay = null
	this.displayLevelInfo = false;
	this.levelInfoCoinTotal = 0;
	this.levelIsUnlocked = false;
};

HomeWorld.inheritsFrom(World);

HomeWorld.prototype.loadMap = function() {
	this.currentMap = new Map(this);
	this.currentMap.loadMap(this.worldId);
};

HomeWorld.prototype.transitionToMap = function(door) {
	if (door.value == "1" || localStorage[Constants.LEVEL_PASSED_ID + (parseInt(door.value) - 1)] == 1) {
		this.gameScreen.goToWorld(door.value);
	}
};

HomeWorld.prototype.displayDoorInformation = function(door) {
	this.displayLevelInfo = true;
	if (this.doorInfoToDisplay != door.value) {
		this.doorInfoToDisplay = door.value;
		this.levelInfoCoinTotal = this.getSavedCoinTotal(door.value);
		this.levelIsUnlocked = this.doorInfoToDisplay == "1" || localStorage[Constants.LEVEL_PASSED_ID + (parseInt(this.doorInfoToDisplay) - 1)] == 1;
	}
};

HomeWorld.prototype.update = function(screenNotTransitioning) {
	this.displayLevelInfo = false;
	World.prototype.update.call(this, screenNotTransitioning);
};

HomeWorld.prototype.draw = function(context) {
	World.prototype.draw.call(this, context);

	if (this.displayLevelInfo) {
		context.fillStyle = DOOR_POPUP_COLOR;
		context.fillRect(DOOR_POPUP_X, DOOR_POPUP_TOP_MARGIN, DOOR_POPUP_WIDTH * 2, DOOR_POPUP_HEIGHT + DOOR_POPUP_TOP_MARGIN);

		var x = DOOR_POPUP_X + 10;
		var y = DOOR_POPUP_TOP_MARGIN + 15;
		if (this.levelIsUnlocked) {
			context.fillStyle = "white";
			context.font = "11px Verdana";
			var levelText = "Level " + this.doorInfoToDisplay;
			context.fillText(levelText, x, y);
			if (localStorage[Constants.LEVEL_PASSED_ID + this.doorInfoToDisplay] == 1) {
				context.fillStyle = "Chartreuse";
				var px = x + context.measureText(levelText).width + 5;
				context.fillText(Constants.LEVEL_PASSED_TEXT, px, y);
				context.fillStyle = "white";
			}

			y += 15;
			context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 88, 400, 8, 8, x, y, 8, 8);
			context.fillText("x " + this.levelInfoCoinTotal.toString(), x + 12, y + 7);

			y += 20;
			if (localStorage[Constants.SPECIAL_ITEM_SAPPHIRE + this.doorInfoToDisplay] == 1) {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 128, 864, 16, 16, x, y, 16, 16);
			} else {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 144, 880, 16, 16, x, y, 16, 16);
			}
			x += 20;
			if (localStorage[Constants.SPECIAL_ITEM_EMERALD + this.doorInfoToDisplay] == 1) {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 128, 848, 16, 16, x, y, 16, 16);
			} else {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 128, 880, 16, 16, x, y, 16, 16);
			}
			x += 20;
			if (localStorage[Constants.SPECIAL_ITEM_RUBY + this.doorInfoToDisplay] == 1) {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 112, 832, 16, 16, x, y, 16, 16);
			} else {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 112, 880, 16, 16, x, y, 16, 16);
			}
			x += 20;
			if (localStorage[Constants.SPECIAL_ITEM_BLK_DIAMOND + this.doorInfoToDisplay] == 1) {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 112, 896, 16, 16, x, y, 16, 16);
			} else {
				context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 160, 880, 16, 16, x, y, 16, 16);
			}
		} else {
			context.fillStyle = "white";
			context.font = "11px Verdana";
			context.fillText("Unknown Level", x+2, y);

			context.fillStyle = "red";
			context.font = "20px Verdana";
			context.fillText("LOCKED", x+4, y+40);
		}
	}
};