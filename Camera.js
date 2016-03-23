
function Camera(world) {
	this.world = world;
	this.x = 0;
	this.y = 0;
}

Camera.prototype = {

	update: function() {
		var map = this.world.getCurrentMap();

		if (map.getPixelWidth() > CANVAS_WIDTH) {
			this.x = Math.min(0, -Math.round(this.world.player.centerX()) + (CANVAS_WIDTH / 2));
			this.x = Math.max(this.x, -(map.getPixelWidth() - CANVAS_WIDTH));
			
		} else {
			this.x = (CANVAS_WIDTH - map.getPixelWidth()) / 2;
		}

		if (map.getPixelHeight() > CANVAS_HEIGHT) {
			this.y = Math.min(0, -Math.round(this.world.player.centerY()) + (CANVAS_HEIGHT / 2));
			this.y = Math.max(this.y, -(map.getPixelHeight() - CANVAS_HEIGHT));
		} else {
			this.y = (CANVAS_HEIGHT - map.getPixelHeight()) / 2;
		}
	},

	setManualCoordinates: function(x, y, map) {
		if (map.getPixelWidth() > CANVAS_WIDTH) {
			this.x = Math.min(0, -Math.round(x) + (CANVAS_WIDTH / 2));
			this.x = Math.max(this.x, -(map.getPixelWidth() - CANVAS_WIDTH));
			
		} else {
			this.x = (CANVAS_WIDTH - map.getPixelWidth()) / 2;
		}

		if (map.getPixelHeight() > CANVAS_HEIGHT) {
			this.y = Math.min(0, -Math.round(y) + (CANVAS_HEIGHT / 2));
			this.y = Math.max(this.y, -(map.getPixelHeight() - CANVAS_HEIGHT));
		} else {
			this.y = (CANVAS_HEIGHT - map.getPixelHeight()) / 2;
		}
	},

	getCollisionRect: function() {
		return new Rectangle(-this.x, -this.y, CANVAS_WIDTH, CANVAS_HEIGHT);
	},

	getCollisionWidthRect: function() {
		return new Rectangle(-this.x, 0, CANVAS_WIDTH, this.world.getCurrentMap().getPixelHeight());
	},

	spawnRectSize: 32,
	getEnemySpawnRect: function() {
		var r = this.getCollisionWidthRect();
		return new Rectangle(r.x - this.spawnRectSize, r.y, r.width + (this.spawnRectSize * 2), r.height);
	},

	getEnemyIgnoreRect: function() {
		var r = this.getCollisionWidthRect();
		return new Rectangle(r.x, 0, r.width, CANVAS_HEIGHT);
	},

	translate: function(context) {
		context.save();
		context.translate(this.x, this.y);
	},

	restore: function(context) {
		context.restore();
	}
};