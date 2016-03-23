
//Enumeration for the states a player can be in at any given time
var PlayerState = {
	JUMPING: 0,
	WALKING: 1,
	SWIMMING: 2,
	CLIMBING: 3
};

//Defines which direction the player is currently facing
var Direction = {
	RIGHT: 0,
	LEFT: 1
};

function Player(world, x, y) {
	this.world = world;
	//pass the start x and y position of the player
	this.x = x;
	this.y = y;

	this.width = 16;
	this.height = 24;

	//tells us whether the player died (from falling, enemy, etc.)
	this.isDead = false;

	//hold the current speed the player is moving in the x and y directions respectively
	this.xCurSpeed = 0;
	this.yCurSpeed = 0;
	//hold the current speed that the player is attempting to reach in the x and y directions respectively
	//these will be used to update the CurSpeed variables above by using linear interpolation.
	this.xTargetSpeed = 0;
	this.yTargetSpeed = this.MAX_FALL_SPEED;

	//hold the current direction we are moving on the y axis (if at all)
	this.yDirection = -1;
	//if jumping, hold the height that has been jumped at a given point in time (in pixels)
	this.heightRisen = 0;
	//hold the current player state. uses PlayerState enumeration as values
	this.state = PlayerState.JUMPING;

	//values used to animate player sprite
	this.currentFrame = 0;
	this.frameCounter = 0;
	this.direction = Direction.RIGHT;

	//holds the position of the bottom of the player before updating y axis.
	//this is used to properly handle colliding with one-way tiles.
	this.previousBottom;

	//flags that tell us whether we have collided with a tile (top of head or bottom of feet on land)
	this.yTopCollisionOccurred = false;
	this.yBottomCollisionOccurred = false;
	//flags that tell us whether we have collided with a tile (while swimming; top or bottom of sprite)
	this.waterTopCollisionOccurred = false;
	this.waterBottomCollisionOccurred = false;
	this.ySpikeBottomCollision = false;
	this.ySpikeTopCollision = false;
	this.xSpikeCollision = false;

	//if the player has collided with an enemy, these will hold the id of the enemy that has been collided with
	//and which axis the collision occurred
	this.enemyXCollision = -1;
	this.enemyYCollision = -1;

	this.health = 3;
	this.isHurt = false;
	this.isDead = false;
}

Player.prototype = {

	SPRITE_X_OFFSET: 2,
	SPRITE_Y_OFFSET: 32,
	//define the source rectangle on the sprite sheet of which sprite to draw on which animation frame
	SPRITE_RECT: { 
		0: new Rectangle(260, 192, 16, 24),
		1: new Rectangle(260, 192, 16, 24),
		2: new Rectangle(16, 848, 24, 16),
		3: new Rectangle(260, 192, 16, 24),
	},

	SPRITE_RECT_HURT: {
		0: new Rectangle(260, 944, 16, 24),
		1: new Rectangle(260, 944, 16, 24),
		2: new Rectangle(16, 912, 24, 16),
		3: new Rectangle(260, 944, 16, 24),
	},

	MAX_WALK_FRAME: 3,
	MAX_SWIM_FRAME: 2,
	CLIMB_START_FRAME: 5,
	MAX_CLIMB_FRAME: 6,
	FRAME_TIME: 6,

	//timer/counter for how long the player has to hold down left or right before they will move off the ladder
	CLIMB_EXIT_TIME: 7,
	climbExitCounter: 0,

	STAND_FRAME_ID: -1,
	JUMP_FRAME_ID: 4,

	MAX_SPEED: 1.5,
	X_WALK_ACCELERATION: 0.15,
	X_JUMP_ACCELERATION: 0.05,
	MIN_SPEED_THRESHOLD: 0.2,

	MAX_FALL_SPEED: 4,
	MAX_JUMP_SPEED: -2,
	Y_FALL_ACCELERATION: 0.04,
	Y_JUMP_ACCELERATION: 1,
	JUMP_BLOCK_HIT_DECELERATION: 0.03,

	SWIM_SPEED_THRESHOLD: 0.4,
	MAX_SWIM_FALL_SPEED: 1,
	MAX_SWIM_RISE_SPEED: -3,
	SWIM_FALL_ACCELERATION: 0.03,
	SWIM_RISE_ACCELERATION: 0.03,
	MAX_SWIM_RISE_HEIGHT: 12,
	
	//jumpHeight holds the max/min jump height after jumping on enemy.
	//the value updates with constant values below depending on if
	//the player receives a jump boost or not.
	jumpHeight: 50,
	REGULAR_JUMP_HEIGHT: 50,
	MIN_JUMP_HEIGHT: 20,
	ENEMY_JUMP_HEIGHT: 53,
	//timer that gives the player some time after hitting an enemy to jump
	jumpPressTimer: 0,
	MAX_JUMP_PRESS_TIME: 3,

	spacePressedDuringJump: false,
	jumpedOnEnemy: false,

	MAX_HURT_TIME: 100,
	hurtCounter: 0,

	LEFT_MARGIN: 3,
	TOP_MARGIN: 3,
	RIGHT_MARGIN: 3,
	BOTTOM_MARGIN: 0,

	getCollisionBox: function() {
		return new Rectangle(this.x + this.LEFT_MARGIN, 
				this.y + this.TOP_MARGIN, 
				this.SPRITE_RECT[this.state].width - this.LEFT_MARGIN - this.RIGHT_MARGIN, 
				this.SPRITE_RECT[this.state].height - this.TOP_MARGIN - this.BOTTOM_MARGIN);
	},

	getLadderCollisionBox: function() {
		return new Rectangle(this.x + 7, 
				this.y + 5, 
				this.SPRITE_RECT[0].width - 7 - 7, 
				this.SPRITE_RECT[0].height - 5 - 5);
	},

	getDoorCollisionBox: function() {
		return new Rectangle(this.x + 7, 
				this.y + 16, 
				this.SPRITE_RECT[0].width - 7 - 7, 
				this.SPRITE_RECT[0].height - 16);
	},

	getSpikeCollisionBox: function() {
		return new Rectangle(this.x + 7, 
				this.y, 
				this.SPRITE_RECT[0].width - 7 - 7, 
				this.SPRITE_RECT[0].height);
	},

	getSpikeBottomDetectRect: function() {
		var rect = this.getSpikeCollisionBox();
		return new Rectangle(rect.x, rect.y + rect.height + this.BOTTOM_MARGIN, rect.width, 1);
	},

	//collision rectangle 1 pixel below player, detects if the player is standing on a tile or not.
	getBottomDetectionRect: function() {
		var rect = this.getCollisionBox();
		return new Rectangle(rect.x, rect.y + rect.height + this.BOTTOM_MARGIN, rect.width, 1);
	},

	//similar to getBottomDetectionRect() above, except is thinner than player and used to detect ladder collisions.
	//the rectangle is thinner so that the player has to be closer to the middle of the ladder to climb down it,
	//instead of being able to climb it if they are only 1 pixel on the x axis over it
	getBottomLadderDetectRect: function() {
		var rect = this.getCollisionBox();
		return new Rectangle(rect.x + 4, rect.y + rect.height + this.BOTTOM_MARGIN, rect.width - 8, 1);
	},

	setX: function(x) {
		this.x = x - this.LEFT_MARGIN;
	},

	setY: function(y) {
		this.y = y - this.TOP_MARGIN;
	},

	centerX: function() {
		return this.x + (this.width / 2);
	},

	centerY: function() {
		return this.y + (this.height / 2);
	},

	update: function(map, acceptInput) {

		//TEMP
		//temporarily used to reset player if they fall off the edge or die from an enemy
		if (acceptInput) {
			if ((this.y > this.world.getCurrentMap().mapData.height * this.world.getCurrentMap().mapData.tileheight) || this.isDead) {
				// this.x = 125;
				// this.y = 20;

				// this.xCurSpeed = 0;
				// this.yCurSpeed = 0;
				// this.xTargetSpeed = 0;
				// this.yTargetSpeed = this.MAX_FALL_SPEED;

				// this.yDirection = this.STAND_FRAME_ID;
				// this.heightRisen = 0;
				// this.state = PlayerState.JUMPING;

				// this.currentFrame = 4;
				// this.direction = 0;

				// this.isDead = false;
				// this.isHurt = false;
				// this.health = 3;

				this.world.transitionToHomeWorld(HOME_WORLD_PREFIX + "1");
			}
		}


		if (this.isHurt) {
			this.hurtCounter++;
			if (this.hurtCounter > this.MAX_HURT_TIME) {
				this.isHurt = false;
			}
		}

		this.checkXCollision(map, acceptInput);
		this.updateYPosition();
		this.checkYCollision(map);

		var key = this.checkItemCollision();
		if (key != null) {
			this.world.onCollectItem(key);
		}

		switch (this.state) {

			case PlayerState.JUMPING:

				//Check if the player jumped on an enemy.
				//If only a Y collision occured (and the player is falling), then they jumped on the enemy.
				if (this.enemyYCollision != -1 && this.enemyXCollision == -1 && this.yCurSpeed > 0) {
					this.jumpOnEnemy();
				}

				//check if an x collision has occurred with an enemy
				//if so, cause damage to player
				if (this.enemyXCollision != -1 && !this.jumpedOnEnemy) {
					if (this.hurt()) {
						this.handleEnemyXCollision();
					}
				}

				//check if player jumped up (into) an enemy, and damage accordingly
				if (this.enemyYCollision != -1 && this.yCurSpeed < 0 && !this.jumpedOnEnemy) {
					if (this.hurt()) {
						this.yCurSpeed = this.MAX_FALL_SPEED / 2;
						this.yTargetSpeed = this.MAX_FALL_SPEED;
					}
				}
				

				//Check if the player is falling
				if (this.yTargetSpeed > 0) {
					if (this.yBottomCollisionOccurred) {
						if (this.ySpikeBottomCollision && !this.isHurt) {
							this.hurt();
							this.xCurSpeed = -this.xCurSpeed;
							this.yTargetSpeed = this.MAX_JUMP_SPEED;
							this.heightRisen = 25;
						} else if (this.ySpikeTopCollision && !this.isHurt) {
							this.hurt();
							this.yTargetSpeed = this.MAX_FALL_SPEED;
							this.yCurSpeed = this.MAX_FALL_SPEED * this.JUMP_BLOCK_HIT_DECELERATION;
						} else { 
							this.state = PlayerState.WALKING;
							this.resetAnimation();
						}
					} else if (this.waterTopCollisionOccurred) {
						this.yTargetSpeed = this.MAX_SWIM_FALL_SPEED;
						if (this.yCurSpeed > this.yTargetSpeed) {
							this.yCurSpeed = this.yTargetSpeed;
						}
						this.state = PlayerState.SWIMMING;
						this.resetAnimation();
					}
					if (this.xSpikeCollision && !this.isHurt) {
						this.hurt();
						this.xCurSpeed = -this.xTargetSpeed;
					} 
				//check if the player is jumping (upward)
				} else {
					if (this.yTopCollisionOccurred) {
						//a collision on the top of the player occurred, set them as falling and push the player
						//down a bit to prevent floating
						if (this.ySpikeTopCollision && !this.isHurt) {
							this.hurt();
						}
						this.yTargetSpeed = this.MAX_FALL_SPEED;
						this.yCurSpeed = this.MAX_FALL_SPEED * this.JUMP_BLOCK_HIT_DECELERATION;
					} else {
						//subtract the amount that the player has risen this update
						this.heightRisen -= this.yCurSpeed;

						if (Input.jumpPressed()) {
							//assume the jump key was pressed mid-air, and prevent it from giving the player
							//any extra jump momentum
							this.spacePressedDuringJump = true;
							if (this.jumpedOnEnemy) {
								//if the jump key was pressed after the player hit an enemy,
								//and they are within the time contraint, give the player the extra boost
								if (this.jumpPressTimer <= this.MAX_JUMP_PRESS_TIME) {
									//jump attempt was valid, update flag accordingly
									this.spacePressedDuringJump = false;
									this.jumpedOnEnemy = false;
								}
							}
						} 

						if (this.jumpedOnEnemy) {
							this.jumpPressTimer++;
							//check to see if the jump key was pressed before the player jumped on the enemy,
							//this way the player will have some margin before jumping on the enemy to get the jump boost.
							if (Input.getJumpHoldTime() <= this.MAX_JUMP_PRESS_TIME && 
								Input.jumpHeld() && !this.spacePressedDuringJump) {
								this.jumpedOnEnemy = false;
							}
						}

						if (Input.jumpHeld() && !this.spacePressedDuringJump && !this.jumpedOnEnemy) {
							//jump boost was successful, so increase the max jump height limit
							if (this.heightRisen >= this.jumpHeight) {
								this.resetJumpValues();
							}
						} else {
							//jump boost was not successful (yet?), so set lower jump height limit
							if (this.heightRisen >= this.MIN_JUMP_HEIGHT) {
								this.resetJumpValues();
							}
						}
					}
					if (this.xSpikeCollision && !this.isHurt) {
						this.hurt();
						this.xCurSpeed = -this.xTargetSpeed;
					}
				}
				this.currentFrame = this.JUMP_FRAME_ID;

				//check if player is attempting to climb a ladder.
				//do not let the player climb while being pushed by an enemy.
				if (Input.upHeld() && !this.isBeingPushed()) {
					this.climb(this.checkLadderCollision(this.getLadderCollisionBox()));
				}

				break;

			case PlayerState.WALKING:

				var doorCollision = this.checkDoorCollision();
				if (doorCollision) {
					this.world.displayDoorInformation(doorCollision);
				}

				if (acceptInput) {
					if (Input.jumpPressed()) {
						this.yTargetSpeed = this.MAX_JUMP_SPEED;
						this.heightRisen = 0;
						this.state = PlayerState.JUMPING;
						break;
					}

					if (Input.upHeld()) {
						if (this.climb(this.checkLadderCollision(this.getLadderCollisionBox()))) {
							break;
						}
						if (doorCollision) {
							this.world.transitionToMap(doorCollision);
							break;
						}
					} else if (Input.downHeld()) {
						if (this.climb(this.checkLadderCollision(this.getBottomLadderDetectRect()))) {
							break;
						}
					}
				}

				if (this.enemyXCollision != -1) {
					if (this.hurt()) {
						this.handleEnemyXCollision();
					}
				}

				//if the player is moving, check if they walked off the edge or onto water
				if (this.xCurSpeed != 0) {
					var waterOnlyCollision = true;
					//flag that tells us if the fall detection rectangle hasn't intersected with any tiles
					var intersects = false;
					var hitSpike = false;
					var columns = this.getIntersectingColumns();
					var row = this.getLowBoundTile(this.getCollisionBox().bottom);
					var fallDetectRect = this.getBottomDetectionRect();
					var spikeDetectRect = this.getSpikeBottomDetectRect();

					//loop through each column to make sure the player is standing on a tile
					for (var i = 0; i < columns.length; i++) {
						//do not attempt to check any out of bounds tiles
						if (columns[i] >= map.mapData.width || columns[i] < 0 ||
							row >= map.mapData.height || row < 0) {
							continue;
						}
						var curTile = map.foregroundTiles[row][columns[i]];
						if (curTile.isActive()) {
							var cb = curTile.getCollisionBox();
							if (fallDetectRect.intersects(cb)) {
								if (curTile.tileType != TileType.WATER) {
									waterOnlyCollision = false;
								}
								if ((curTile.tileType == TileType.LADDER && map.foregroundTiles[row - 1][columns[i]].tileType == TileType.LADDER)) {
									continue;
								}
								intersects = true;
							}
							if (spikeDetectRect.intersects(cb)) {
								if (curTile.tileType == TileType.TOP_BOTTOM_SPIKE) {
									hitSpike = true;
								}
							}
						}
					}

					if (hitSpike && !this.isHurt) {
						this.hurt();
						this.xCurSpeed = -this.xTargetSpeed;
					}

					if (!intersects || waterOnlyCollision) {
						this.yTargetSpeed = this.MAX_FALL_SPEED;
						this.yCurSpeed = this.yTargetSpeed * 0.1;
						this.state = PlayerState.JUMPING;
					}

					if (this.frameCounter++ > this.FRAME_TIME) {
						this.frameCounter = 0;
						this.currentFrame++;
					}
					if (this.currentFrame > this.MAX_WALK_FRAME) {
						this.currentFrame = 0;
					}
				} else {

					if (this.xSpikeCollision && !this.isHurt) {
						this.hurt();
						this.xCurSpeed = this.direction == Direction.RIGHT ? -this.MAX_SPEED : this.MAX_SPEED;
					}

					var columns = this.getIntersectingColumns();
					var row = this.getLowBoundTile(this.getCollisionBox().bottom);
					var spikeDetectRect = this.getSpikeBottomDetectRect();

					for (var i = 0; i < columns.length; i++) {
						if (columns[i] >= map.mapData.width || columns[i] < 0 ||
							row >= map.mapData.height || row < 0) {
							continue;
						}
						var curTile = map.foregroundTiles[row][columns[i]];
						if (curTile.isActive()) {
							if (spikeDetectRect.intersects(curTile.getCollisionBox())) {
								if (curTile.tileType == TileType.TOP_BOTTOM_SPIKE) {
									if (!this.isHurt) {
										this.hurt();
										this.xCurSpeed = this.direction == Direction.RIGHT ? -this.MAX_SPEED : this.MAX_SPEED;
									}
									break;
								}
							}
						}
					}

					this.currentFrame = this.STAND_FRAME_ID;
				}

				break;

			case PlayerState.SWIMMING:
				if (Input.jumpPressed()) {
					this.yTargetSpeed = this.MAX_SWIM_RISE_SPEED;
					this.heightRisen = 0;
				}

				if (this.enemyXCollision != -1) {
					if (this.hurt()) {
						this.handleEnemyXCollision();
					}
				}

				if (this.enemyYCollision != -1) {
					if (this.hurt()) {
						this.yCurSpeed = this.MAX_FALL_SPEED / 2;
						this.yTargetSpeed = this.MAX_FALL_SPEED;
					}
				}

				if (this.yCurSpeed <= 0) {
					if (this.yTopCollisionOccurred && !this.waterTopCollisionOccurred) {
						this.yTargetSpeed = this.MAX_SWIM_FALL_SPEED;
						this.yCurSpeed = this.MAX_SWIM_FALL_SPEED / 4;
					} else if (!this.waterTopCollisionOccurred) {
						this.yTargetSpeed = this.MAX_JUMP_SPEED;
						if (this.yCurSpeed > this.yTargetSpeed) {
							this.yCurSpeed = this.yTargetSpeed;
						}
						this.heightRisen = 0;
						this.state = PlayerState.JUMPING;
					} else {
						this.heightRisen -= this.yCurSpeed;
						if (this.heightRisen >= this.MAX_SWIM_RISE_HEIGHT) {
							this.yTargetSpeed = this.MAX_SWIM_FALL_SPEED;
						}
					}
				}

				if (this.xTargetSpeed != 0 || this.yCurSpeed < 0) {
					if (this.frameCounter++ > this.FRAME_TIME) {
						this.frameCounter = 0;
						this.currentFrame++;
					}
					if (this.currentFrame > this.MAX_SWIM_FRAME) {
						this.currentFrame = 0;
					}
				} else {
					this.currentFrame = 0;
				}

				break;

			case PlayerState.CLIMBING:

				this.yTargetSpeed = 0;
				if (!Input.deadlockUpDown()) {
					if (Input.downHeld()) {
						this.yTargetSpeed += 1.4;
					} 
					if (Input.upHeld()) {
						this.yTargetSpeed += -1.4;
					}
				}
				

				if (this.yBottomCollisionOccurred && Input.downHeld()) {
					this.state = PlayerState.WALKING;
				}

				if (Input.jumpPressed() && !(Input.upHeld() && Input.downHeld())) {
					this.state = PlayerState.JUMPING;
					this.heightRisen = 0;
					this.yTargetSpeed = this.MAX_JUMP_SPEED;
					this.xTargetSpeed = 0;
					this.xCurSpeed = 0;
					break;
				}

				if (this.enemyYCollision != -1 && this.enemyXCollision == -1 && this.yCurSpeed > 0) {
					this.world.getCurrentMap().removeActiveEnemy(this.enemyYCollision);
					break;
				}

				if (this.enemyXCollision != -1) {
					if (this.hurt()) {
						this.handleEnemyXCollision();
						this.yTargetSpeed = this.MAX_FALL_SPEED;
						this.yCurSpeed = 0;
						this.state = PlayerState.JUMPING;
						break;
					}
				}
				
				if ((Input.leftHeld() || Input.rightHeld()) && !(Input.upHeld() || Input.downHeld()) && !(Input.leftHeld() && Input.rightHeld())) {
					this.climbExitCounter++;
					if (this.climbExitCounter > this.CLIMB_EXIT_TIME) {
						this.state = PlayerState.JUMPING;
						this.yTargetSpeed = this.MAX_FALL_SPEED;
						this.yDirection = -1;
						this.yCurSpeed = 0;
						this.xTargetSpeed = Input.leftHeld() ? -this.MAX_SPEED : this.MAX_SPEED;
						this.xCurSpeed = Input.leftHeld() ? -this.MAX_SPEED / 4 : this.MAX_SPEED / 4;
						break;
					}
				} else {
					this.climbExitCounter = 0;
				}

				if (this.checkLadderCollision(this.getCollisionBox()) == null) {
					this.state = PlayerState.JUMPING;
					this.yTargetSpeed = this.MAX_FALL_SPEED;
					this.xTargetSpeed = 0;
					this.xCurSpeed = 0;
					this.yCurSpeed = Math.abs(this.yCurSpeed);
					break;
				}

				if (this.yCurSpeed != 0) {
					if (this.frameCounter++ > this.FRAME_TIME) {
						this.frameCounter = 0;
						this.currentFrame++;
					}
					if (this.currentFrame > this.MAX_CLIMB_FRAME) {
						this.currentFrame = this.CLIMB_START_FRAME;
					}
				}

				break;
				
			default:
				break;
		}

	},

	checkXCollision: function(map, acceptInput) {

		if (!this.isBeingPushed()) {
			this.xTargetSpeed = 0;
			
			if (Input.deadlockOrNotPressed() || !acceptInput) {
				var threshold = this.state == PlayerState.SWIMMING ? this.SWIM_SPEED_THRESHOLD : this.MIN_SPEED_THRESHOLD;
				if (Math.abs(this.xCurSpeed) < threshold) {
					this.xCurSpeed = 0;
				}
			} else {
				if (Input.rightHeld()) {
					this.direction = Direction.RIGHT;
					this.xTargetSpeed += this.MAX_SPEED;
				} 
				if (Input.leftHeld()) {
					this.direction = Direction.LEFT;
					this.xTargetSpeed -= this.MAX_SPEED;
				} 
			}
		}

		this.updateXPosition();

		this.enemyXCollision = -1;
		var enemies = this.world.getCurrentMap().activeEnemies;
		for (var i = 0; i < enemies.length; i++) {
			if (this.getCollisionBox().intersects(enemies[i].getCollisionRect())) {
				this.enemyXCollision = i;
				break;
			}
		}

		this.xSpikeCollision = false;

		var hitTile = this.sideCollision(map, this.getUpperBoundTile(this.getCollisionBox().right) - 1);
		if (hitTile != null) {
			var collisionBox = hitTile.getCollisionBox();
			this.setX(collisionBox.left - this.getCollisionBox().width);
			this.xCurSpeed = 0;
		}

		hitTile = this.sideCollision(map, this.getLowBoundTile(this.getCollisionBox().left))
		if (hitTile != null) {
			var collisionBox = hitTile.getCollisionBox();
			this.setX(collisionBox.right);
			this.xCurSpeed = 0;
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
				if (tile.tileType == TileType.SIDE_SPIKE) {
					this.xSpikeCollision = true;
				}

				if (this.getCollisionBox().intersects(tile.getCollisionBox())) {
					return tile;
				}
			}
		}

		return null;
	},

	updateXPosition: function() {
		switch (this.state) {
			case PlayerState.JUMPING:
			case PlayerState.WALKING:
				var accel = (this.state == PlayerState.JUMPING) ? this.X_JUMP_ACCELERATION : this.X_WALK_ACCELERATION
				this.xCurSpeed = accel * this.xTargetSpeed + (1 - accel) * this.xCurSpeed;

				this.x += this.xCurSpeed;

				break;
			case PlayerState.SWIMMING:
				var accel = 0.03;
				this.xCurSpeed = accel * this.xTargetSpeed + (1 - accel) * this.xCurSpeed;

				this.x += this.xCurSpeed;

				break;
			default:
				break;
		}

		if (this.x < 0) {
			this.x = 0;
			this.xCurSpeed = 0;
		}
		if (this.x + this.width - this.RIGHT_MARGIN > this.world.getCurrentMap().getPixelWidth()) {
			this.x = this.world.getCurrentMap().getPixelWidth() - this.width + this.RIGHT_MARGIN;
			this.xCurSpeed = 0;
		}
	},

	updateYPosition: function() {
		this.previousBottom = this.getCollisionBox().bottom;

		switch (this.state) {
			case PlayerState.JUMPING:
				var accel = (this.yTargetSpeed < 0) ? this.Y_JUMP_ACCELERATION : this.Y_FALL_ACCELERATION;

				this.yCurSpeed = accel * this.yTargetSpeed + (1 - accel) * this.yCurSpeed;
				this.y += this.yCurSpeed;

				break;
			case PlayerState.SWIMMING:
				var accel = (this.yTargetSpeed < 0) ? this.SWIM_RISE_ACCELERATION : this.SWIM_FALL_ACCELERATION;

				this.yCurSpeed = accel * this.yTargetSpeed + (1 - accel) * this.yCurSpeed;
				this.y += this.yCurSpeed;

				break;
			case PlayerState.CLIMBING:
				var accel = 1;

				this.yCurSpeed = accel * this.yTargetSpeed + (1 - accel) * this.yCurSpeed;
				this.y += this.yCurSpeed;

				break;
			default:
				break;
		}
	},

	checkYCollision: function(map) {

		//check enemy collisions in the y direction
		this.enemyYCollision = -1;
		var enemies = this.world.getCurrentMap().activeEnemies;
		for (var i = 0; i < enemies.length; i++) {
			if (this.getCollisionBox().intersects(enemies[i].getCollisionRect())) {
				this.enemyYCollision = i;
				break;
			}
		}

		//reset collision flags
		this.yTopCollisionOccurred = false;
		this.yBottomCollisionOccurred = false;
		this.waterTopCollisionOccurred = false;
		this.waterBottomCollisionOccurred = false;
		this.ySpikeBottomCollision = false;
		this.ySpikeTopCollision = false;


		var columns = this.getIntersectingColumns();
		var waterTilesHit = 0;
		var totalTilesHit = 0;

		//first, check any collision on the bottom of the player's collision box (at their feet)
		var startY = this.getLowBoundTile(this.getCollisionBox().bottom);
		for (var i = 0; i < columns.length; i++) {
			if (columns[i] >= map.mapData.width || columns[i] < 0 ||
				startY >= map.mapData.height || startY < 0) {
				continue;
			}

			var topTile = map.foregroundTiles[startY][columns[i]];
			if (topTile.isActive()) {
				if (topTile.tileType == TileType.ONE_WAY || (topTile.tileType == TileType.LADDER && map.foregroundTiles[startY - 1][columns[i]].tileType != TileType.LADDER)) {
					if (this.previousBottom > topTile.getCollisionBox().top) {
						continue;
					}
				} else if (topTile.tileType == TileType.LADDER) {
					continue;
				}

				if (this.getCollisionBox().intersects(topTile.getCollisionBox())) {
					if (topTile.tileType == TileType.WATER) {
						waterTilesHit++;
					}
					totalTilesHit++;
				}
				if (this.getSpikeCollisionBox().intersects(topTile.getCollisionBox())) {
					if (topTile.tileType == TileType.TOP_BOTTOM_SPIKE) {
						this.ySpikeBottomCollision = true;
					}
				}
			} 
		}

		if (totalTilesHit > 0) {
			if (waterTilesHit == totalTilesHit) {
				this.waterBottomCollisionOccurred = true;
			} else {
				this.yBottomCollisionOccurred = true;
			}
		}

		//Next check and collisions at the top of the player's collision box (at the head)
		startY = this.getUpperBoundTile(this.getCollisionBox().top) - 1;
		waterTilesHit = 0;
		totalTilesHit = 0;
		var bottomTile;
		for (var i = 0; i < columns.length; i++) {
			if (columns[i] >= map.mapData.width || columns[i] < 0 ||
				startY >= map.mapData.height || startY < 0) {
				continue;
			}

			var bottom = map.foregroundTiles[startY][columns[i]];
			if (bottom.isActive()) {
				if (bottom.tileType == TileType.ONE_WAY || 
					bottom.tileType == TileType.LADDER) {
					continue;
				}

				if (this.getCollisionBox().intersects(bottom.getCollisionBox())) {
					bottomTile = bottom;
					if (this.getCollisionBox().intersects(bottomTile.getCollisionBox())) {
						if (bottomTile.tileType == TileType.WATER) {
							waterTilesHit++;
						} else if (bottomTile.tileType == TileType.TOP_BOTTOM_SPIKE) {
							this.ySpikeTopCollision = true;
						}
						totalTilesHit++;
					}
				}
			}
		}

		if (totalTilesHit > 0) {
			if (waterTilesHit == totalTilesHit) {
				this.waterTopCollisionOccurred = true;
			} else {
				this.yTopCollisionOccurred = true;
			}
		}

		if (this.yCurSpeed > 0) {
			if (this.yBottomCollisionOccurred) {
				this.y = topTile.getCollisionBox().top - this.getCollisionBox().height - this.TOP_MARGIN;
				this.yCurSpeed = 0;
			}
		} else {
			if (this.yTopCollisionOccurred) {
				this.y = bottomTile.getCollisionBox().bottom - this.TOP_MARGIN;
			}
		}
	},

	checkLadderCollision: function(cb) {
		return this.checkSpecialTileCollision(cb, TileType.LADDER);
	},

	checkDoorCollision: function() {
		var map = this.world.getCurrentMap();
		for (var i = 0; i < map.doorObjects.length; i++) {
			if (this.getDoorCollisionBox().intersects(map.doorObjects[i].getSpecialCollisionBox(ObjectType.DOOR))) {
				return map.doorObjects[i];
			}
		}
		return null;
	},

	checkItemCollision: function() {
		var map = this.world.getCurrentMap();
		for (var key in map.items) {
			if (map.items[key].isActive) {
				if (this.getCollisionBox().intersects(map.items[key].getCollisionBox())) {
					return key;
				}
			}
		}
		return null;
	},

	checkSpecialTileCollision: function(cb, type) {
		var col = this.getIntersectingColumns();
		var row = this.getIntersectingRows();
		row.push(row[row.length-1]+1);

		for (var i = 0; i < col.length; i++) {
			if (col[i] < 0 || col[i] >= this.world.getCurrentMap().mapData.width) {
				continue;
			}

			for (var j = 0; j < row.length; j++) {
				if (row[j] < 0 || row[j] >= this.world.getCurrentMap().mapData.height) {
					continue;
				}

				var tile = this.world.getCurrentMap().foregroundTiles[row[j]][col[i]];
				if (tile.tileType == type) {
					if (tile.getSpecialCollisionBox(type).intersects(cb)) {
						return tile;
					}
				}
			}
		}
		return null;
	},

	//this function causes damage to the player and puts them in a 'hurt' state.
	//returns true if player was hurt, false otherwise
	hurt: function() {
		//if player is currently in a hurt state, don't hurt again.
		if (!this.isHurt) {
			this.isHurt = true;
			this.hurtCounter = 0;
			this.health--;

			if (this.health <= 0) {
				this.isDead = true;
			}
			return true;
		}
		return false;
	},

	isBeingPushed: function() {
		return this.isHurt && this.hurtCounter < 10;
	},

	resetJumpValues: function() {
		this.yTargetSpeed = this.MAX_FALL_SPEED;
		this.jumpHeight = this.REGULAR_JUMP_HEIGHT;
		this.spacePressedDuringJump = false;
		this.jumpedOnEnemy = false;
	},

	jumpOnEnemy: function() {
		this.world.getCurrentMap().removeActiveEnemy(this.enemyYCollision);
		this.yCurSpeed = 0;
		this.yTargetSpeed = this.MAX_JUMP_SPEED;
		this.heightRisen = 0;
		this.jumpHeight = this.ENEMY_JUMP_HEIGHT;
		this.jumpedOnEnemy = true;
		this.jumpPressTimer = 0;
		//bump player up so if enemies are on top of each other, player won't collide with them.
		this.y -= 2;
	},

	handleEnemyCollision: function(enemyIndex) {
		var enemy = this.world.getCurrentMap().activeEnemies[enemyIndex];
		//if enemy and player are walking the right direction
		if (this.xCurSpeed > 0 && enemy.direction == AnimDir.RIGHT) {
			if (this.x > enemy.x) {
				this.xTargetSpeed = this.MAX_SPEED;
				enemy.direction *= -1;
			} else {
				this.xTargetSpeed = -this.MAX_SPEED
			}
		//both enemy and player walking in left direction
		} else if (this.xCurSpeed < 0 && enemy.direction == AnimDir.LEFT) {
			if (this.x > enemy.x) {
				this.xTargetSpeed = this.MAX_SPEED;
			} else {
				this.xTargetSpeed = -this.MAX_SPEED;
				enemy.direction *= -1;
			}
		}
		//player is standing still, push in direction enemy is moving. 
		else {
			this.xTargetSpeed = enemy.direction * this.MAX_SPEED;
			enemy.direction *= -1;
		}
		this.xCurSpeed = this.xTargetSpeed * 0.9;
	},

	handleEnemyXCollision: function() {
		this.handleEnemyCollision(this.enemyXCollision);
	},

	handleEnemyYCollision: function() {
		this.handleEnemyCollision(this.enemyYCollision);
	},

	setStartValues: function() {
		this.xCurSpeed = 0;
		this.yCurSpeed = 0;
		this.xTargetSpeed = 0;
		this.yTargetSpeed = this.MAX_FALL_SPEED;

		this.yDirection = -1;
		this.heightRisen = 0;
		this.state = PlayerState.JUMPING;

		this.currentFrame = 0;
		this.frameCounter = 0;
		this.direction = 0;

		this.isHurt = false;
	},

	climb: function(tile, key) {
		if (tile != null) {
			//if player is standing on top of ladder, and climbs down, if they tap down fast enough they won't actually be on the ladder
			//this will push them down so they will always be on the ladder if they press down on top of one.
			if (Input.downHeld() && !Input.upHeld()) {
				this.y += 1;
			}
			this.x = tile.getCenter().x - (this.width / 2);
			this.state = PlayerState.CLIMBING;
			this.climbExitCounter = 0;
			this.xCurSpeed = 0;
			this.xTargetSpeed = 0;
			this.yCurSpeed = 0;
			this.yTargetSpeed = 0;
			this.currentFrame = this.CLIMB_START_FRAME;
			this.frameCounter = 0;
			return true;
		}
		return false;
	},

	resetAnimation: function() {
		this.currentFrame = 0;
		this.frameCounter = 0;
	},

	getIntersectingColumns: function() {
		return this.getIntersectList(this.getCollisionBox().left, this.getCollisionBox().right);
	},

	getIntersectingRows: function() {
		return this.getIntersectList(this.getCollisionBox().top, this.getCollisionBox().bottom);
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
		// context.fillStyle = "rgba(255, 0, 0, 1)";
		// var col = this.getIntersectingColumns();
		// var row = this.getIntersectingRows();
		// for (var i = 0; i < col.length; i++) {
		// 	if (col[i] < 0 || col[i] >= this.world.getCurrentMap().mapData.width) {
		// 		continue;
		// 	}

		// 	for (var j = 0; j < row.length; j++) {
		// 		if (row[j] < 0 || row[j] >= this.world.getCurrentMap().mapData.height) {
		// 			continue;
		// 		}
		// 		context.fillRect(col[i] * Tile.size, row[j] * Tile.size, Tile.size, Tile.size);
		// 	}
		// }

		var spriteRect = (this.isHurt && this.hurtCounter % 10 > 3) 
			? this.SPRITE_RECT_HURT[this.state] 
			: this.SPRITE_RECT[this.state];

		context.drawImage(AssetManager.getImage(ImageAsset.tile_set_1), 
					spriteRect.x + ((spriteRect.width + this.SPRITE_X_OFFSET) * this.currentFrame), 
					spriteRect.y + (this.direction * this.SPRITE_Y_OFFSET), 
					spriteRect.width, 
					spriteRect.height, 
					Math.round(this.x), Math.round(this.y), spriteRect.width, spriteRect.height);


		// context.fillStyle = "rgba(0, 0, 255, 1)";
		// var r = this.getSpikeBottomDetectRect();
		// context.fillRect(r.x, r.y, r.width, r.height);

		// context.fillStyle = "rgba(255, 0, 0, 1)";
		// context.fillText("state: " + this.state, 100, 180);
		// context.fillText("xCurSpeed: " + this.xCurSpeed, 100, 190);
		// context.fillText("xTargetSpeed: " + this.xTargetSpeed, 100, 200);
		// context.fillText("yCurSpeed: " + this.yCurSpeed, 100, 210);

		// context.fillText("columns: " + this.getIntersectingColumns(), 10, 60);
		// context.fillText("rows: " + this.getIntersectingRows(), 10, 70);
		// context.fillText("x: " + Math.round(this.x) + " y: " + Math.round(this.y), 10, 80);
	}
};