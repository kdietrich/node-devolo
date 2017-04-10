"use strict";
var DevoloApi_1 = require("./DevoloApi");
var Zone = (function () {
    function Zone(id, name, devices) {
        this.id = id;
        this.name = name;
        this.devices = devices;
    }
    return Zone;
}());
exports.Zone = Zone;
var Rule = (function () {
    function Rule() {
    }
    Rule.prototype.setParams = function (id, name, description, enabled) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.enabled = enabled;
    };
    Rule.prototype.getEnabled = function () {
        return this.enabled;
    };
    Rule.prototype.setEnabled = function (enabled, callback) {
        this.enabled = enabled;
        callback('');
    };
    return Rule;
}());
exports.Rule = Rule;
var Scene = (function () {
    function Scene() {
    }
    Scene.prototype.setParams = function (id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
    };
    Scene.prototype.invoke = function (callback) {
        var api = DevoloApi_1.DevoloAPI.getInstance();
        var scene = JSON.parse(JSON.stringify(this));
        scene.id = scene.id.replace('Scene:', 'SceneControl:');
        api.invokeOperation(scene, 'start', function (err) {
            if (err) {
                callback(err);
                return;
            }
            callback(null);
        });
    };
    return Scene;
}());
exports.Scene = Scene;
