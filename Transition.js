
TransitionState = {
	IN: 0,
	OUT: 1
};

TransitionType = {
	ZOOM: 0,
	FADE: 1
};

function Transition(state, transitionType, speed, startPos) {
	this.state = state;
	this.transitionType = transitionType;
	this.speed = speed;

	var alpha = 0;
	switch (this.transitionType) {
		case TransitionType.ZOOM:
			if (this.state == TransitionState.IN) {
				this.transitionRectangle = (startPos == null) ? 
					new Rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT) :
					new Rectangle(startPos.x - CANVAS_WIDTH, startPos.y - CANVAS_HEIGHT, CANVAS_WIDTH * 2, CANVAS_HEIGHT * 2);
			} else {
				this.transitionRectangle = (startPos == null) ? 
					new Rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 1, 1) :
					startPos;
			}

			alpha = 1;
			break;
		case TransitionType.FADE:
			this.transitionRectangle = new Rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			alpha = (this.state == TransitionState.IN) ? 1 : 0;
			break;
	}

	this.tColor = new Color(0, 0, 0, alpha);
}

Transition.prototype = {

	zoomPadding: 0,
	isComplete: function() {
		switch (this.transitionType) {
			case TransitionType.ZOOM:
				if (this.state == TransitionState.IN) {
					return this.transitionRectangle.width < 0 || this.transitionRectangle.height < 0;
				} else {
					return this.transitionRectangle.x < -this.zoomPadding && this.transitionRectangle.y < -this.zoomPadding && this.transitionRectangle.right > CANVAS_WIDTH+this.zoomPadding && this.transitionRectangle.bottom > CANVAS_HEIGHT+this.zoomPadding;
				}
				break;
			case TransitionType.FADE:
				return (this.state == TransitionState.IN && this.tColor.a <= 0) || (this.state == TransitionState.OUT && this.tColor.a >= 1)
				break;
		}
	},

	update: function() {
		switch (this.transitionType) {
			case TransitionType.ZOOM:
				this.speed += 0.1;
				if (this.state == TransitionState.IN) {
					this.transitionRectangle = new Rectangle(this.transitionRectangle.x + (this.speed*1.9),
						this.transitionRectangle.y + this.speed,
						this.transitionRectangle.width - (this.speed*3.8),
						this.transitionRectangle.height - (this.speed*2));
				} else {
					this.transitionRectangle = new Rectangle(this.transitionRectangle.x - (this.speed*1.9),
						this.transitionRectangle.y - this.speed,
						this.transitionRectangle.width + (this.speed*3.8),
						this.transitionRectangle.height + (this.speed*2));
				}
				break;
			case TransitionType.FADE:
				this.tColor.a += (this.state == TransitionState.IN) ? -this.speed : this.speed;
				break;
		}
	},

	draw: function(context) {
		context.fillStyle = this.tColor.toString();
		context.fillRect(this.transitionRectangle.x,
			this.transitionRectangle.y,
			this.transitionRectangle.width,
			this.transitionRectangle.height);
	},
};