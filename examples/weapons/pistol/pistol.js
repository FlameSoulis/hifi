//
//  pistol.js
//  examples/toybox/entityScripts
//
//  Created by Eric Levin on11/11/15.
//  Copyright 2015 High Fidelity, Inc.
//

//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
/*global print, MyAvatar, Entities, AnimationCache, SoundCache, Scene, Camera, Overlays, Audio, HMD, AvatarList, AvatarManager, Controller, UndoStack, Window, Account, GlobalServices, Script, ScriptDiscoveryService, LODManager, Menu, Vec3, Quat, AudioDevice, Paths, Clipboard, Settings, XMLHttpRequest, randFloat, randInt */


(function() {
    Script.include("../../libraries/utils.js");
    Script.include("../../libraries/constants.js");

    var _this;
    Pistol = function() {
        _this = this;
        this.equipped = false;
        this.forceMultiplier = 1;
        this.laserOffsets = {
            y: .15,
        };
        this.firingOffsets = {
            z: 0.3
        }
        this.fireSound = SoundCache.getSound("https://s3.amazonaws.com/hifi-public/sounds/Guns/GUN-SHOT2.raw");
        this.fireVolume = 0.5;
        this.bulletForce = 10;
    };

    Pistol.prototype = {

        startEquip: function(id, params) {
            this.equipped = true;
            this.hand = JSON.parse(params[0]);
            Overlays.editOverlay(this.laser, {
                visible: true
            });
        },

        continueNearGrab: function() {
            if (!this.equipped) {
                return;
            }
            this.updateLaser();
        },

        updateLaser: function() {
            var gunProps = Entities.getEntityProperties(this.entityID, ['position', 'rotation']);
            var position = gunProps.position;
            var rotation = gunProps.rotation;
            this.firingDirection = Quat.getFront(rotation);
            var upVec = Quat.getUp(rotation);
            this.barrelPoint = Vec3.sum(position, Vec3.multiply(upVec, this.laserOffsets.y));
            var laserTip = Vec3.sum(this.barrelPoint, Vec3.multiply(this.firingDirection, 10));
            this.barrelPoint = Vec3.sum(this.barrelPoint, Vec3.multiply(this.firingDirection, this.firingOffsets.z))
            Overlays.editOverlay(this.laser, {
                start: this.barrelPoint,
                end: laserTip,
                alpha: 1
            });
        },

        unequip: function() {
            this.hand = null;
            this.equipped = false;
            Overlays.editOverlay(this.laser, {
                visible: false
            });
        },

        preload: function(entityID) {
            this.entityID = entityID;
            this.initControllerMapping();
            this.laser = Overlays.addOverlay("line3d", {
                start: ZERO_VECTOR,
                end: ZERO_VECTOR,
                color: COLORS.RED,
                alpha: 1,
                visible: true,
                lineWidth: 2
            });
        },

        triggerPress: function(hand, value) {
            if (this.hand === hand && value === 1) {
                //We are pulling trigger on the hand we have the gun in, so fire
                this.fire();
            }
        },

        fire: function() {
            var pickRay = {
                origin: this.barrelPoint,
                direction: this.firingDirection
            };
            Audio.playSound(this.fireSound, {
                position: this.barrelPoint,
                volume: this.fireVolume
            });
            this.createGunFireEffect(this.barrelPoint)
            var intersection = Entities.findRayIntersectionBlocking(pickRay, true);
            if (intersection.intersects) {
                this.createEntityHitEffect(intersection.intersection);
                if (intersection.properties.collisionsWillMove === 1) {
                    // Any entity with collisions will move can be shot
                    Entities.editEntity(intersection.entityID, {
                        velocity: Vec3.multiply(this.firingDirection, this.bulletForce)
                    });
                }
            }
        },

        initControllerMapping: function() {
            this.mapping = Controller.newMapping();
            this.mapping.from(Controller.Standard.LT).hysteresis(0.0, 0.5).to(function(value) {
                _this.triggerPress(0, value);
            });


            this.mapping.from(Controller.Standard.RT).hysteresis(0.0, 0.5).to(function(value) {
                _this.triggerPress(1, value);
            });
            this.mapping.enable();

        },

        unload: function() {
            this.mapping.disable();
            Overlays.deleteOverlay(this.laser);
        },

        createEntityHitEffect: function(position) {
            var flash = Entities.addEntity({
                type: "ParticleEffect",
                position: position,
                lifetime: 4,
                "name": "Flash Emitter",
                "color": {
                    red: 228,
                    green: 128,
                    blue: 12
                },
                "maxParticles": 1000,
                "lifespan": 0.15,
                "emitRate": 1000,
                "emitSpeed": 1,
                "speedSpread": 0,
                "emitOrientation": {
                    "x": -0.4,
                    "y": 1,
                    "z": -0.2,
                    "w": 0.7071068286895752
                },
                "emitDimensions": {
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "polarStart": 0,
                "polarFinish": Math.PI,
                "azimuthStart": -3.1415927410125732,
                "azimuthFinish": 2,
                "emitAcceleration": {
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "accelerationSpread": {
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "particleRadius": 0.03,
                "radiusSpread": 0.02,
                "radiusStart": 0.02,
                "radiusFinish": 0.03,
                "colorSpread": {
                    red: 100,
                    green: 100,
                    blue: 20
                },
                "alpha": 1,
                "alphaSpread": 0,
                "alphaStart": 0,
                "alphaFinish": 0,
                "additiveBlending": true,
                "textures": "http://ericrius1.github.io/PartiArt/assets/star.png"
            });

            Script.setTimeout(function() {
                Entities.editEntity(flash, {
                    isEmitting: false
                });
            }, 100);

        },

        createGunFireEffect: function(position) {
            var smoke = Entities.addEntity({
                type: "ParticleEffect",
                position: position,
                lifetime: 1,
                "name": "Smoke Hit Emitter",
                "maxParticles": 1000,
                "lifespan": 4,
                "emitRate": 20,
                emitSpeed: 0,
                "speedSpread": 0,
                "emitDimensions": {
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "polarStart": 0,
                "polarFinish": 0,
                "azimuthStart": -3.1415927410125732,
                "azimuthFinish": 3.14,
                "emitAcceleration": {
                    "x": 0,
                    "y": 0.5,
                    "z": 0
                },
                "accelerationSpread": {
                    "x": .2,
                    "y": 0,
                    "z": .2
                },
                "radiusSpread": .04,
                "particleRadius": 0.07,
                "radiusStart": 0.07,
                "radiusFinish": 0.07,
                "alpha": 0.7,
                "alphaSpread": 0,
                "alphaStart": 0,
                "alphaFinish": 0,
                "additiveBlending": 0,
                "textures": "https://hifi-public.s3.amazonaws.com/alan/Particles/Particle-Sprite-Smoke-1.png"
            });
            Script.setTimeout(function() {
                Entities.editEntity(smoke, {
                    isEmitting: false
                });
            }, 100);

            var flash = Entities.addEntity({
                type: "ParticleEffect",
                position: position,
                lifetime: 4,
                "name": "Muzzle Flash",
                "color": {
                    red: 228,
                    green: 128,
                    blue: 12
                },
                "maxParticles": 1000,
                "lifespan": 0.1,
                "emitRate": 1000,
                "emitSpeed": 0.5,
                "speedSpread": 0,
                "emitOrientation": {
                    "x": -0.4,
                    "y": 1,
                    "z": -0.2,
                    "w": 0.7071068286895752
                },
                "emitDimensions": {
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "polarStart": 0,
                "polarFinish": Math.PI,
                "azimuthStart": -3.1415927410125732,
                "azimuthFinish": 2,
                "emitAcceleration": {
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "accelerationSpread": {
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "particleRadius": 0.05,
                "radiusSpread": 0.01,
                "radiusStart": 0.05,
                "radiusFinish": 0.05,
                "colorSpread": {
                    red: 100,
                    green: 100,
                    blue: 20
                },
                "alpha": 1,
                "alphaSpread": 0,
                "alphaStart": 0,
                "alphaFinish": 0,
                "additiveBlending": true,
                "textures": "http://ericrius1.github.io/PartiArt/assets/star.png"
            });

            Script.setTimeout(function() {
                Entities.editEntity(flash, {
                    isEmitting: false
                });
            }, 100)

        }

    };

    // entity scripts always need to return a newly constructed object of our type
    return new Pistol();
});