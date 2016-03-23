
var AnimDir = {
	RIGHT: 1,
	LEFT: -1
}

function Animation(startX, startY, width, height, frames, frameTime, direction) {
	this.startX = startX;
	this.startY = startY;
	this.width = width;
	this.height = height;
	this.maxFrames = frames;
	this.currentFrame = 0;
	this.direction = direction;

	this.frameTime = 0;
	this.maxFrameTime = frameTime;
}

Animation.prototype = {

	reset: function() {
		this.frameTime = 0;
		this.currentFrame = 0;
	},

	update: function(direction) {
		this.direction = direction;

		if (++this.frameTime > this.maxFrameTime) {
			this.frameTime = 0;

			this.currentFrame++;
			if (this.currentFrame >= this.maxFrames) {
				this.currentFrame = 0;
			}
		}

	},

	getAnimRect: function() {
		return new Rectangle(this.startX + (this.width * this.currentFrame),
		 	this.startY + (this.direction == AnimDir.RIGHT ? 0 : this.height),
		 	this.width,
		 	this.height);
	}
};