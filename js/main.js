const DIRECTION_LEFT = 0;
const DIRECTION_UP = 1;
const DIRECTION_RIGHT = 2;
const DIRECTION_DOWN = 3;

function DynamicAudioManager() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.currentKey = "";
    this.currentStart = 0;
    this.variations = {};
    this.buffer = undefined;
    this.currentPlay = undefined;
    this.currentOffset = 0;

    this.add = function(dynAudio) {
        this.variations[dynAudio.key] = dynAudio;
    }

    this.play = function(key) {
        if (key != this.currentKey) {
            if (this.currentPlay) {
                this.currentPlay.stop();
            }
            // Get the time we should start.
            let start = 0;
            if (this.currentKey) {
                start = this.getStartTime(this.currentKey, key);
                this.currentOffset = start;
            }

            // Swap
            this.currentKey = key;
            this.currentStart = this.context.currentTime;
            let index = this.findIndexByKey(key);
            if (index == -1) {
                console.warn("Sound doesn't exist.");
                return;
            }

            console.log("Play audio " + index);

            this.currentPlay = new Sound(this.context, this.buffer.getSoundByIndex(index));
            this.currentPlay.play(start);
        }
    }

    this.findIndexByKey = function(key) {
        let index = 0;
        for (i in this.variations) {
            console.log(i, key);
            if (i == key) {
                return index;
            }
            index++
        }
        return -1;
    }

    // Gets the appropriate time in the next track to start playing.
    this.getStartTime = function(oldkey, newkey) {
        // Grab obj
        var src = this.variations[oldkey];
        // Grab time, in minutes.
        // Make sure we add in the previous offset in order to line-up our measures properly. Otherwise we assume the last track started at 0s.
        var time = (this.context.currentTime - this.currentStart + this.currentOffset) / 60;
        // Measures per minute may change depending on time signature. We assume 4/4.
        var measuresPerMinute = src.bpm / 4;
        var measuresPlayed = time * measuresPerMinute;
        // Take the modulus based on how many measures have been played.
        var scoreMeasures = 45; // Assume this. It's 44 measures (+1 because of end).
        var measuresModulus = measuresPlayed % scoreMeasures;
        // Now compute the start time based on next track.
        var newsrc = this.variations[newkey];
        var newMeasuresPerMinute = newsrc.bpm / 4; // Assume 4/4.
        var minutes = measuresModulus / newMeasuresPerMinute;
        console.log(time, measuresPerMinute, measuresPlayed, measuresModulus, newMeasuresPerMinute, minutes);
        return minutes * 60; // Convert back to s.
    }

    this.reset = function() {
        this.currentKey = '';
        this.currentPlay = undefined;
    }

    this.load = function() {
        let urls = [];
        for (i in this.variations) {
            urls.push(this.variations[i].filename);
        }
        this.buffer = new Buffer(this.context, urls);
        let thisManager = this;
        this.buffer.loadAll(function() {
            if (thisManager.currentKey) {
                console.log("Resetting and playing " + thisManager.currentKey);
                thisManager.reset();
                thisManager.play(thisManager.currentKey);
            }
        });
    }
}

function DynamicAudio(key, filename, bpm) {
    this.key = key;
    this.filename = filename;
    this.bpm = bpm;
}

function Buffer(context, urls) {
    this.context = context;
    this.urls = urls;
    this.buffer = [];

    this.loadSound = function(url, index, callback) {
        let request = new XMLHttpRequest();
        request.open('get', url, true);
        request.responseType = 'arraybuffer';
        let thisBuffer = this;
        request.onload = function() {
            thisBuffer.context.decodeAudioData(request.response, function(buffer) {
                console.log(typeof buffer, typeof thisBuffer, buffer);
                thisBuffer.buffer[index] = buffer;
                if(index == thisBuffer.urls.length-1) {
                    console.log("All sounds loaded");
                    callback();
                    thisBuffer.loaded();
                }
            });
        };
        request.send();
    };

    this.loadAll = function(callback) {
        this.urls.forEach((url, index) => {
            this.loadSound(url, index, callback);
        })
    }

    this.loaded = function() {
        // what happens when all the files are loaded
        console.log("Done loading all sounds");
    }

    this.getSoundByIndex = function(index) {
        return this.buffer[index];
    }
}

function Sound(context, buffer) {
    this.context = context;
    this.buffer = buffer;

    this.init = function() {
        this.gainNode = this.context.createGain();
        console.log(typeof this.buffer, this.buffer)
        this.source = this.context.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.loop = true;
        this.source.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
    };

    this.play = function(starttime) {
        this.init();
        this.source.start(this.context.currentTime, starttime);
    };

    this.stop = function() {
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5);
        this.source.stop(this.context.currentTime + 0.5);
    }
}

window.onload = function() {
	//start crafty
	Crafty.init(1024, 592);
	Crafty.canvas.init();
    var currentScene = '';
    window.audioManager = new DynamicAudioManager();

	//turn the sprite map into usable components
    var obj = {};
    for (var i = 0; i < 57; i++) {
        for (var j = 0; j < 31; j++) {
            obj[i + '-' + j] = [i, j];
        }
    }
	Crafty.sprite(16, "images/roguelikeSheet_transparent.png", obj, 1, 1, 0);

    Crafty.sprite(24, 32, "images/character-hero.png", {
        char_hero: [0, 0]
    });

    Crafty.sprite(24, 32, "images/character-fox-furry.png", {
        char_fox: [0, 0]
    }, 0, 0, 0);

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
    let impassableTiles = ["waterBody", "waterGrassTM"];
    let maps = {
        test: town,
        plains: plains
    };

	//method to randomy generate the map
	function generateWorld(map) {
        for (z in maps[map]) {
            for (y in maps[map][z]) {
                for (x in maps[map][z][y]) {
                    let tile = maps[map][z][y][x];
                    if (!tile || tile == "-1--1") { continue; }; // Ignore nulls or undefineds
                    var classes = "2D, Canvas, " + tile;
                    if (impassableTiles.indexOf(tile) > -1) {
                        classes += ", impassable";
                    }
                    if (z == 2) {
                        classes += ", solid, Collision";
                    }
                    if (z > 2) {
                        classes += ", DOM";
                    }
                    Crafty.e(classes)
                        .attr({x: x * 16, y: y * 16, z: z});
                }
            }
        }
	}

    //the death screen
	Crafty.scene("ded", function() {
		//black background with some loading text
        currentScene = 'ded';
		Crafty.background("#000");
		Crafty.e("2D, DOM, Text").attr({w: 100, h: 298, x: 450, y: 120})
			.text("u r ded m8")
			.css({"text-align": "center"});
	});

	//the loading screen that will display while our assets load
	Crafty.scene("loading", function() {
		//load takes an array of assets and a callback when complete
		Crafty.load(["images/roguelikeSheet_transparent.png", "images/character-hero.png", "images/character-fox-furry.png", "audio/town.ogg", "audio/adventure.ogg", "audio/combat.ogg"], function () {
            // Start music
            audioManager.add(new DynamicAudio("town", "audio/town.ogg", 120));
            audioManager.add(new DynamicAudio("adventure", "audio/adventure.ogg", 100));
            audioManager.add(new DynamicAudio("combat", "audio/combat.ogg", 150));
            audioManager.load();

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

    function loadDistance() {
        let distance = Infinity;
        let x = Crafty('Hero')._x;
        let y = Crafty('Hero')._y;
        Crafty('Enemy').each(function(i) {
            // Compute distance
            let d = Math.sqrt(Math.pow(this._x - x, 2) + Math.pow(this._y - y, 2));
            distance = Math.min(distance, d);
        });
        return distance;
    }

    function createHero() {
        Crafty.c('Hero', {
            hitPoints: 100,
			init: function() {
					//setup animations
					this.requires("SpriteAnimation, Collision, char_hero")
					.animate("walk_left", 0, 3, 2)
					.animate("walk_right", 0, 1, 2)
					.animate("walk_up", 0, 0, 2)
					.animate("walk_down", 0, 2, 2)
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
						if(this.hit('solid')) {
							this.attr({x: from.x, y: from.y});
						} else if (this.hit('Enemy')) {
                            console.log("Enemy");
                            this.attr({x: from.x, y: from.y});
                        }

                        // Move to next scene maybe
                        if (this.y > Crafty.viewport.height && currentScene == 'plains') {
                            Crafty.scene('main');
                        } else if (this.y < 0 && currentScene == 'main') {
                            Crafty.scene('plains');
                        }
					})
                    .bind('Attack', function() {
                        if (--this.hitPoints <= 0) {
                            Crafty.scene('ded');
                        }
                    })
                    .bind('KeyDown', function(e) {
                        if (this.hit('Enemy') && e.key == Crafty.keys.SPACE) {
                            // Attack
                            console.log('Attack', this.hit('Enemy'));
                            this.hit('Enemy')[0].obj.trigger('Attack');
                        }
                    })
                    .bind('EnterFrame', function(e) {
                        if (currentScene != "plains") {
                            return;
                        }
                        if (loadDistance() < 64) {
                            // Combat!
                            audioManager.play("combat");
                        } else {
                            // Adventure
                            audioManager.play("adventure");
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
        player = Crafty.e("2D, DOM, solid, char_hero, Hero, RightControls, Animate, SpriteAnimation, Collision")
            .attr({x: 512, y: 256, z: 2})
            .rightControls(1)
            .collision([0, 16], [24, 16], [24, 32], [0, 32]);
    }

    function releaseMonster() {
        Crafty.c('Enemy', {
            directionUpdated: new Date().getTime() - 3000,
            direction: DIRECTION_LEFT,
            justCreated: true,
            hitPoints: 1,
            init: function() {
					//setup animations
					this.requires("SpriteAnimation, Collision, char_fox")
					.animate("walk_left2", 0, 3, 2)
					.animate("walk_right2", 0, 1, 2)
					.animate("walk_up2", 0, 0, 2)
					.animate("walk_down2", 0, 2, 2)
					//change direction when a direction change event is received
					.bind("NewDirection",
						function () {
							if (this.direction == DIRECTION_LEFT) {
								if (!this.isPlaying("walk_left2"))
									this.stop().animate("walk_left2", 10, -1);
							} else if (this.direction == DIRECTION_RIGHT) {
								if (!this.isPlaying("walk_right2"))
									this.stop().animate("walk_right2", 10, -1);
							} else if (this.direction == DIRECTION_UP) {
								if (!this.isPlaying("walk_up2"))
									this.stop().animate("walk_up2", 10, -1);
							} else if (this.direction == DIRECTION_DOWN) {
								if (!this.isPlaying("walk_down2"))
									this.stop().animate("walk_down2", 10, -1);
							} else {
								this.stop();
							}
					})
                    .bind('EnterFrame', function() {
                        if (this.hit('Hero')) {
                            // Move into direction
                            this.direction = (Crafty('Hero').direction + 2) % 4;
                            // ATTACK!
                            if (new Date().getTime() - this.directionUpdated > 1000) {
                                this.directionUpdated = new Date().getTime();
                                Crafty('Hero').trigger('Attack');
                            }
                            return;
                        }

                        if (new Date().getTime() - this.directionUpdated > 3000 || this.x <= 0 || this.x >= Crafty.viewport.width || this.y <= 0 || this.y >= Crafty.viewport.height) {
                            this.directionUpdated = new Date().getTime();
                            this.direction = Crafty.math.randomInt(0, 3);
                            this.trigger('NewDirection');
                        }

                        if (this.hit('solid')) {
                            this.direction = 4;
                            this.direction = Crafty.math.randomInt(0, 3);
                            this.trigger('NewDirection');
                            if (this.justCreated) {
                                this.destroy(); // Spawn fail.
                            }
                        }

                        this.justCreated = false;

                        if (this.direction == DIRECTION_LEFT) {
                            this.x--;
                        } else if (this.direction == DIRECTION_RIGHT) {
                            this.x++;
                        } else if (this.direction == DIRECTION_UP) {
                            this.y--;
                        } else if (this.direction == DIRECTION_DOWN) {
                            this.y++;
                        }

                    })
                    .bind('Attack', function() {
                        if (--this.hitPoints < 1) {
                            this.destroy();
                        }
                    });
				return this;
			}
        });
        player = Crafty.e("2D, DOM, solid, char_fox, Animate, Enemy, SpriteAnimation, Collision")
                .attr({x: Crafty.math.randomInt(0, 55) * 16, y: Crafty.math.randomInt(0, 35) * 16, z: 2})
    }

    Crafty.scene("main", function() {
        generateWorld('test');
        currentScene = 'main';
        createHero();

        try {
            audioManager.play("town");
        } catch(e) {
            console.warn(e);
        }
    });

    Crafty.scene("plains", function() {
        generateWorld('plains');
        currentScene = 'plains';
        audioManager.play("adventure");

        createHero();
        releaseMonster();
        var interval = setInterval(function() {
            if (currentScene == 'plains') {
                // Create new enemy and release it into the wild.
                releaseMonster();
            } else {
                clearInterval(interval);
            }
        }, 15000);
    });
};

/* MAPS */
town = [[["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","3-0","3-0","3-0","3-0","3-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","0-0","0-0","0-0","0-0","0-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","0-0","0-0","0-0","0-0","0-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","3-2","3-2","3-2","3-2","3-2","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","3-0","3-0","3-0","3-0","3-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","0-0","0-0","0-0","0-0","0-0","0-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","3-2","3-2","3-2","3-2","3-2","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"],["5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0","5-0"]],[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"31-9",null,null,null,"31-9"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"31-9",null,null,null,"31-9"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"31-9",null,null,null,"31-9"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1","-1--1",null,null,"-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"53-17","34-17","35-17","35-17","35-17","36-17","53-16"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"34-17","35-17","35-17","35-17","36-17",null,null,null,"-1--1","-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"34-17","35-17","35-17","35-17","36-17",null,null,null,null,"-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"53-17","34-17","35-17","35-17","35-17","36-17","53-16"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1","22-11",null,"-1--1",null,null,"-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"22-11",null,null,null,null,null,null,null,null,null,null,null,null,"-1--1",null,"-1--1","-1--1","-1--1","-1--1","-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"53-17","34-17","35-17","35-17","35-17","36-17","53-16"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1",null,null,"34-17","35-17","35-17","35-17","36-17"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1",null,"53-17","34-17","35-17","35-17","35-17","36-17","53-16"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1",null,null,null,"-1--1","-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"22-11"],[null,null,null,null,"29-9"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,"28-9"],null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"28-9",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"29-9"],null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"6-11"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"9-7",null,null,null,null,null,null,null,null,null,null,null,"30-9"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"29-9",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"9-7"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"29-9",null,null,null,null,"9-7"],[null,null,null,null,null,null,null,null,null,null,null,"6-11",null,null,null,"-1--1",null,null,null,null,null,null,null,null,"30-9",null,null,null,null,null,null,null,null,null,null,null,null,null,null,"9-7"],[null,null,null,null,null,null,null,null,null,null,null,"9-7",null,null,null,"-1--1",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"9-7"],[null,null,null,null,null,null,null,null,null,null,null,"7-8","9-8","9-8","9-8","9-8","9-8","9-8","9-8","9-8","9-8","9-8","9-8","9-8","9-8","9-8","5-7","9-8","9-8","9-8","9-8","9-8","9-8","5-7","9-8","9-8","9-8","9-8","9-8","6-8","5-12"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1",null,null,null,null,null,null,null,null,null,null,"9-7",null,null,null,null,null,null,"9-7",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"28-9"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"9-7",null,null,null,null,null,null,"9-7"],[null,null,null,null,null,null,null,null,null,null,null,"28-9",null,null,null,null,"29-9",null,null,null,null,null,null,null,null,null,"9-7",null,null,null,null,null,null,"9-7"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"9-7",null,null,null,null,null,null,"9-7",null,null,"30-9"],[null,null,"29-9",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"9-7",null,null,null,null,null,null,"9-7"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"9-7",null,null,null,"28-9",null,null,"9-7"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"6-11","30-9",null,"9-7",null,null,null,null,null,null,"9-7",null,"29-9"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-8","9-8","9-8","8-8",null,null,null,null,null,null,"9-7"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"6-18","9-14","9-14","5-16","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","8-15","9-15"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-17","8-17","8-17","8-17","8-17","8-17","8-17","6-15","8-16","5-15","8-17","8-17","8-17","8-17","8-17","8-17","8-17","8-17","8-17","8-17","9-17"]],[[],null,null,["3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","4-0"],["0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","4-1",null,null,null,null,null,null,null,null,null,"2-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","-1--1","-1--1","-1--1","-1--1","-1--1","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0"],["0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","4-1",null,"23-11",null,null,null,null,null,null,null,"2-1","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","-1--1","-1--1","-1--1","-1--1","-1--1","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0"],["0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-2","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","1-2","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","-1--1","-1--1","-1--1","-1--1","-1--1","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0"],["0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-1","3-2","3-2","3-2","3-2","3-2","3-2","3-2","-1--1","-1--1","-1--1","-1--1","-1--1","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","1-1","1-0","1-0","1-0","1-0","1-0","1-0","1-0","1-0","1-0"],["3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","1-1","0-0","0-0","0-0","4-1","23-11",null,null,null,null,null,null,null,null,null,null,"-1--1",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"2-1","1-0","1-0","1-0","1-0","1-0","1-0","1-0","1-0","1-0"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,"23-11",null,null,null,"2-1","0-0","0-0","0-0","4-1",null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1",null,"-1--1","-1--1",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"2-1","1-0","1-0","1-0","1-0","1-0","1-0","1-0","1-0","1-0"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"2-1","0-0","0-0","0-0","0-2","3-0","3-0","3-0","3-0","3-0","3-0","3-0","-1--1","-1--1","-1--1","-1--1","-1--1","3-0","3-0","3-0","3-0","3-0","3-0","3-0","3-0","4-0",null,null,null,"24-9","24-11",null,null,null,null,"24-11","2-1","1-0","1-0","1-0","1-0","1-0","1-0","1-0","1-0","1-0"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"2-1","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","-1--1","-1--1","-1--1","-1--1","-1--1","0-0","0-0","0-0","0-0","0-0","0-0","0-0","0-0","4-1","24-10","24-10","24-9",null,null,"24-9","24-10","24-11","24-10",null,"2-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"2-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","-1--1","-1--1","-1--1","-1--1","-1--1","3-2","3-2","3-2","3-2","3-2","3-2","3-2","3-2","4-2"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"13-11",null,null,null,null,null,"19-0"],null,null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"11-5","12-4","13-4","10-6",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"38-21","39-21","40-21"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"38-22","39-22","40-22",null,null,"-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"24-11",null,null,null,null,null,null,null,null,null,"48-23","53-23","38-23","39-23","40-23","53-23","52-23","52-23","49-23"],[null,null,null,null,null,null,null,null,null,"-1--1","-1--1","-1--1","-1--1"],[null,null,null,null,null,null,null,null,null,"-1--1","38-21","39-21","40-21"],[null,null,null,null,null,null,null,null,null,null,"38-22","39-22","40-22"],[null,null,null,null,null,null,null,null,null,"23-11","38-23","39-23","40-23","23-11"],[null,null,null,null,"24-10"],null,null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"13-11"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"27-9"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"17-14","18-14","18-14","18-14","18-14","18-14","19-14"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"38-21","39-21","40-21",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"24-11",null,null,null,null,null,"17-15","18-15","18-15","18-15","18-15","18-15","19-15"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"38-22","39-22","40-22",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"17-21","18-21","18-21","18-21","18-21","18-21","19-21"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"38-23","39-23","40-23",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"17-22","18-22","18-22","18-22","18-22","18-22","19-22"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"17-22","18-22","18-22","18-22","18-22","18-22","19-22"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"24-10",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"48-23","17-23","18-23","18-23","18-23","18-23","18-23","19-23","49-23"]],[[],null,null,[null,"54-19","54-19"],[null,"53-15",null,null,null,"28-10",null,null,null,null,"23-10",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"53-17",null,null,null,null,null,"53-16"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"25-11"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"25-11"],[null,"25-11",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"23-10",null,null,null,null,null,"53-17",null,null,null,null,null,"53-16"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,"23-10",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"28-11"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"28-11"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"53-17",null,null,null,null,null,"53-16"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1",null,null,null,null,null,null,"28-11"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"13-10","53-17",null,null,null,null,null,"53-16"],null,null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"11-1","11-0","11-0","11-2",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"34-21","39-21","35-21"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"34-22","39-23","35-22"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"34-23",null,"35-23"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"46-4"],[null,null,null,null,null,null,null,null,null,null,"34-21","39-21","35-21"],[null,null,null,null,null,null,null,null,null,null,"34-22","39-23","35-22"],[null,null,null,null,null,null,null,null,null,null,"34-23",null,"35-23"],[null,null,null,null,null,null,null,null,null,"23-10",null,"46-4",null,"23-10"],null,[null,null,null,null,null,null,null,null,null,null,null,"-1--1"],[null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1","-1--1","-1--1"],[null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1","-1--1","-1--1","-1--1","-1--1","-1--1","-1--1",null,null,null,null,null,null,null,"-1--1",null,null,null,null,null,null,null,null,null,null,null,null,null,"13-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1","-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"34-21","39-21","35-21"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"34-22","39-23","35-22"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"53-21",null,null,"34-23",null,"35-23"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"46-4",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"50-0",null,null,null,"50-0"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"53-22","53-22",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"50-1",null,null,null,"50-1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"50-2",null,null,null,"50-2"]]];

plains = [[["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"],["3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16","3-16"]],[[],null,null,null,null,null,null,null,null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-9","8-9","8-9","8-9","8-9","8-9","8-9","8-9","8-9","8-9","8-9","8-9","8-9","8-9"],[null,null,null,null,null,null,"-1--1","-1--1",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10"],[null,null,null,null,null,null,"-1--1","13-8",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10"],[null,null,null,null,null,null,null,"-1--1",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1",null,null,null,null,"7-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1","-1--1",null,"7-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"30-9",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-10","8-10","8-10","8-10","53-11","53-11","53-11","53-11","53-11","53-11","53-11","53-11","53-11","8-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"30-9","30-9","30-9","30-9",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"30-9",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10","8-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"7-11","8-11","8-11","8-11","8-11","8-11","8-11","8-11","8-11","8-11","8-11","8-11","8-11","8-11"],null,null,null,null,null,null,null,null,null,null,null,null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"3-13","3-13","3-13",null,null,null,null,null,null,null,"3-13","3-13","3-13"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"3-13","3-13","3-13",null,null,null,null,null,null,null,"3-13","3-13","3-13"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"3-13",null,"3-13","3-13",null,null,null,null,null,null,null,"3-13",null,"3-13","3-13"]],[[null,null,null,null,null,null,null,null,"2-1","3-1","3-1","3-1","4-1"],[null,null,null,null,null,null,null,null,"2-2","3-2","3-2","3-2","4-2"],null,null,["16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11"],["16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11",null,null,null,null,null,null,null,null,null,null,"-1--1","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11"],[null,null,null,null,null,null,null,null,"53-19","53-21","16-11","53-19",null,null,null,null,null,"16-11","16-11","16-11","16-11","16-11",null,null,null,null,null,null,null,null,"16-11","16-11","16-11","16-11",null,null,null,null,"-1--1","-1--1","-1--1","-1--1","-1--1","-1--1","-1--1"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11",null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1","-1--1","-1--1"],[null,null,null,null,null,null,"46-10","47-10",null,null,null,null,null,null,null,null,null,null,null,null,null,"16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11","16-11"],[null,null,null,null,null,"53-22","46-11","47-11","51-13","52-13"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"54-20"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"37-12","35-12","35-12","35-12","35-12","35-12","35-12","35-12","38-12"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"37-13","35-12","35-12","35-12","35-12","35-12","35-12","35-12","38-13"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"37-19","38-19","38-19","38-19","38-19","38-19","38-19","38-19","39-19"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1","-1--1","-1--1","-1--1","-1--1","-1--1",null,"35-19","38-15","40-19","40-20","40-19","40-20","40-19","40-20","40-19","40-15","35-19"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"-1--1","-1--1","-1--1","-1--1","-1--1","-1--1","-1--1","35-20","37-20","38-20","38-20","38-20","38-20","38-20","38-20","38-20","39-20","35-20"],null,null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"54-20"],null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"54-20"]],[[],null,[null,null,null,null,null,null,null,null,null,"-1--1"],["16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10"],["16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10",null,null,null,null,null,null,null,null,null,null,null,"16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10"],[null,null,null,null,null,null,null,null,null,null,"16-10",null,null,null,null,null,null,"16-10","16-10","16-10","16-10","16-10",null,null,null,null,null,null,null,null,"16-10","16-10","16-10","16-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10","16-10"],null,null,null,null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"34-20",null,"51-10",null,null,"52-10",null,null,"51-10",null,"34-20"],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"35-19",null,null,null,null,null,null,null,null,null,"35-19"]]]
