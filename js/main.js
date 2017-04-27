window.onload = function() {
	//start crafty
	Crafty.init(1024, 592);
	Crafty.canvas.init();

	//turn the sprite map into usable components
	Crafty.sprite(16, "images/roguelikeSheet_transparent.png", {
        waterBody:      [0, 0],
        waterBody2:     [1, 0],
        waterGrassTL:   [2, 0],
        waterGrassTM:   [3, 0],
        waterGrassTR:   [4, 0],
        grassBody:      [5, 0],
        clayBody:       [6, 0],
        stoneBody:      [7, 0],
        sandBody:       [8, 0],
        stoneBody2:     [9, 0],
        redStallM:      [10, 0],
        greenStallM:    [11, 0],
        fireplaceNone:  [12, 0],
        fireplace:      [13, 0], // and 14
        anvil:          [15, 0],
        waterGrassML:   [2, 1],
        waterGrassMM:   [3, 1],
        waterGrassMR:   [4, 1],
        waterGrassBL:   [2, 2],
        waterGrassBM:   [3, 2],
        waterGrassBR:   [4, 2],
        lilyPad:        [25, 11],
        flowerBlue:     [28, 9],
        flowerRed:      [29, 9],
        flowerPurple:   [30, 9],
        flowerWhite:    [31, 9],
	}, 1, 1, 0);

    Crafty.sprite(16, "images/character-hero.png", {
        char_hero: [1, 2]
    });

    // Dumb fill of entire row
    function fill(type) {
        var fillarray = [];
        for (var i = 0; i < 64; i++) {
            fillarray.push(type);
        }
        return fillarray;
    }

    // Supply array of objects, with type and count, and it'll generate the row.
    function smartFill(obj) {
        var args = Array.prototype.slice.call(arguments, 0);
        var fillarray = [];
        for (var i in args) {
            for (var j = 0; j < args[i].count; j++) {
                fillarray.push(args[i].type);
            }
        }
        return fillarray;
    }

    // Maps
    let maps = {
        test: [
            [
                fill("grassBody"),
                smartFill({type: "waterGrassTM", count: 5}, {type: "waterGrassTR", count: 1}, {type: "grassBody", count: 59}),
                smartFill({type: "waterBody", count: 5}, {type: "waterGrassMR", count: 1}, {type: "grassBody", count: 59}),
                smartFill({type: "waterBody", count: 5}, {type: "waterGrassMR", count: 1}, {type: "grassBody", count: 59}),
                smartFill({type: "waterBody", count: 5}, {type: "waterGrassMR", count: 1}, {type: "grassBody", count: 59}),
                smartFill({type: "waterBody", count: 5}, {type: "waterGrassMR", count: 1}, {type: "grassBody", count: 59}),
                smartFill({type: "waterBody", count: 5}, {type: "waterGrassMR", count: 1}, {type: "grassBody", count: 59}),
                smartFill({type: "waterBody", count: 5}, {type: "waterGrassMR", count: 1}, {type: "grassBody", count: 59}),
                smartFill({type: "waterBody", count: 5}, {type: "waterGrassMR", count: 1}, {type: "grassBody", count: 59}),
                smartFill({type: "waterBody", count: 5}, {type: "waterGrassMR", count: 1}, {type: "grassBody", count: 59}),
                smartFill({type: "waterGrassBM", count: 5}, {type: "waterGrassBR", count: 1}, {type: "grassBody", count: 59}),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
                fill("grassBody"),
            ], [
                [],
                [],
                [],
                [undefined, undefined, undefined, undefined, "lilyPad"],
                [],
                [],
                [],
                [],
                [],
                [],
                [],
                [],
                [undefined, "flowerWhite", undefined, "flowerBlue", undefined, "flowerWhite"]
            ]
        ]
    };

	//method to randomy generate the map
	function generateWorld(map) {
        for (z in maps[map]) {
            for (y in maps[map][z]) {
                for (x in maps[map][z][y]) {
//                    console.log(x, y, z);
                    Crafty.e("2D, DOM, solid, " + maps[map][z][y][x])
                        .attr({x: x * 16, y: y * 16, z: z});
                }
            }
        }
	}

	//the loading screen that will display while our assets load
	Crafty.scene("loading", function() {
		//load takes an array of assets and a callback when complete
		Crafty.load(["images/roguelikeSheet_transparent.png", "images/character-hero.png"], function () {
			Crafty.scene("main"); //when everything is loaded, run the main scene
		});

		//black background with some loading text
		Crafty.background("#000");
		Crafty.e("2D, DOM, Text").attr({w: 100, h: 298, x: 450, y: 120})
			.text("Loading")
			.css({"text-align": "center"});
	});

	//automatically play the loading scene
	Crafty.scene("loading");

	Crafty.scene("main", function() {
		generateWorld('test');

		Crafty.c('Hero', {
			init: function() {
					//setup animations
					this.requires("SpriteAnimation, Collision, anvil")
					.animate("walk_left", 0, 2, 2)
					.animate("walk_right", 0, 1, 2)
					.animate("walk_up", 0, 3, 2)
					.animate("walk_down", 0, 0, 2)
					//change direction when a direction change event is received
					.bind("NewDirection",
						function (direction) {
							if (direction.x < 0) {
								if (!this.isPlaying("walk_left"))
									this.stop().animate("walk_left", 10, -1);
							}
							if (direction.x > 0) {
								if (!this.isPlaying("walk_right"))
									this.stop().animate("walk_right", 10, -1);
							}
							if (direction.y < 0) {
								if (!this.isPlaying("walk_up"))
									this.stop().animate("walk_up", 10, -1);
							}
							if (direction.y > 0) {
								if (!this.isPlaying("walk_down"))
									this.stop().animate("walk_down", 10, -1);
							}
							if(!direction.x && !direction.y) {
								this.stop();
							}
					})
					// A rudimentary way to prevent the user from passing solid areas
					.bind('Moved', function(from) {
						if(this.hit('solid')){
							this.attr({x: from.x, y:from.y});
						}
					});
				return this;
			}
		});

		Crafty.c("RightControls", {
			init: function() {
				this.requires('Multiway');
			},

			rightControls: function(speed) {
				this.multiway(speed, {UP_ARROW: -90, DOWN_ARROW: 90, RIGHT_ARROW: 0, LEFT_ARROW: 180})
				return this;
			}

		});

		//create our player entity with some premade components
		player = Crafty.e("2D, DOM, solid, flowerPurple, RightControls, Animate, SpriteAnimation, Collision")
			.attr({x: 512, y: 256, z: 1})
			.rightControls(1);
	});
};
