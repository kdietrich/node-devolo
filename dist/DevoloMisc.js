"use strict";
var DevoloApi_1 = require("./DevoloApi");
var events_1 = require("events");
events_1.EventEmitter.defaultMaxListeners = 100;
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
        this.events = new events_1.EventEmitter();
    }
    Rule.prototype.setParams = function (id, name, description, enabled) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.enabled = enabled;
    };
    Rule.prototype.listen = function () {
        var self = this;
        var api = DevoloApi_1.DevoloAPI.getInstance();
        api._ws.on('message', function (message) {
            var jsonStr;
            try {
                jsonStr = JSON.parse(message);
            }
            catch (err) {
                throw err;
            }
            if (jsonStr.properties.uid && jsonStr.properties.uid.replace('ServiceControl', 'Service') == self.id) {
                if (jsonStr.properties['property.name'] === 'enabled') {
                    self.onEnabledChanged(jsonStr.properties['property.value.new']);
                }
                else {
                }
            }
        });
    };
    Rule.prototype.getEnabled = function () {
        return this.enabled;
    };
    Rule.prototype.setEnabled = function (enabled, callback) {
        this.enabled = enabled;
        callback('');
    };
    Rule.prototype.onEnabledChanged = function (value) {
        var self = this;
        this.setEnabled(value, function () {
            self.events.emit('onEnabledChanged', value);
        });
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
