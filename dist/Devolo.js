"use strict";
var DevoloMisc_1 = require("./DevoloMisc");
var DevoloApi_1 = require("./DevoloApi");
var DevoloDevice_1 = require("./DevoloDevice");
var DevoloSensor_1 = require("./DevoloSensor");
var Devolo = (function () {
    function Devolo(options, callback) {
        this.version = '201707161504';
        this._api = DevoloApi_1.DevoloAPI.getInstance();
        this._options = options;
        this._api.setOptions(options);
        var self = this;
        self.initAuth(function (err) {
            if (err) {
                callback(err);
                return;
            }
            self.auth(function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                self._api.connect(function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, self);
                });
            });
        });
    }
    ;
    Devolo.prototype.initAuth = function (callback) {
        //        console.log('initAuth')
        if (this._options.uuid && this._options.gateway && this._options.passkey) {
            callback(null);
            return;
        }
        var self = this;
        self._api.fetchUUID(function (err, uuid) {
            if (err) {
                callback(err);
                return;
            }
            self._options.uuid = uuid;
            self._api.fetchGateway(function (err, gateway) {
                if (err) {
                    callback(err);
                    return;
                }
                self._options.gateway = gateway;
                self._api.fetchPasskey(function (err, passkey) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    self._options.passkey = passkey;
                    callback(null);
                });
            });
        });
    };
    ;
    Devolo.prototype.auth = function (callback, forceRenew) {
        if (forceRenew === void 0) { forceRenew = false; }
        //        console.log('auth');
        if (this._options.sessionid && !forceRenew) {
            callback();
            return;
        }
        var self = this;
        self._api.fetchSessionid(function (err, sessionid) {
            if (err) {
                callback(err);
                return;
            }
            self._options.sessionid = sessionid;
            callback();
        });
    };
    ;
    Devolo.prototype.getZones = function (callback) {
        //        console.log("getZones")
        var self = this;
        self._api.fetchItems(["devolo.Grouping"], function (err, items) {
            if (err) {
                callback(err);
                return;
            }
            var zones = [];
            for (var i = 0; i < items.length; i++) {
                for (var j = 0; j < items[i].properties.zones.length; j++) {
                    var zone = new DevoloMisc_1.Zone(items[i].properties.zones[j].id, items[i].properties.zones[j].name, items[i].properties.zones[j].deviceUIDs);
                    zones.push(zone);
                }
            }
            callback(null, zones);
        });
    };
    ;
    Devolo.prototype.getAllDevices = function (callback) {
        var self = this;
        this.getZones(function (err, zones) {
            if (err) {
                callback(err);
                return;
            }
            var deviceIDs = [];
            for (var i = 0; i < zones.length; i++) {
                for (var j = 0; j < zones[i].devices.length; j++) {
                    deviceIDs.push(zones[i].devices[j]);
                }
            }
            //console.log(deviceIDs); return;
            self.getDevices(deviceIDs, function (err, devices) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, devices);
            });
        });
    };
    ;
    Devolo.prototype.getDevices = function (ids, callback) {
        //        console.log("getDevices")
        var self = this;
        var allElementUIDs = [];
        var devices = [];
        self._api.fetchItems(ids, function (err, items) {
            if (err) {
                callback(err);
                return;
            }
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                //               console.log(item);
                if (item.UID.indexOf('virtual:device') > -1) {
                    continue; //not supported yet
                }
                var device;
                if (item.properties.deviceModelUID.indexOf('Door/Window:Sensor') > -1) {
                    device = new DevoloDevice_1.DoorWindowDevice();
                }
                else if (item.properties.deviceModelUID.indexOf('Humidity:Sensor') > -1) {
                    device = new DevoloDevice_1.HumidityDevice();
                }
                else if (item.properties.deviceModelUID.indexOf('Flood:Sensor') > -1) {
                    device = new DevoloDevice_1.FloodDevice();
                }
                else if (item.properties.deviceModelUID.indexOf('Motion:Sensor') > -1) {
                    device = new DevoloDevice_1.MotionDevice();
                }
                else if (item.properties.deviceModelUID.indexOf('Wall:Plug:Switch:and:Meter') > -1) {
                    device = new DevoloDevice_1.SwitchMeterDevice();
                }
                else if (item.properties.deviceModelUID.indexOf('Thermostat:Valve') > -1) {
                    device = new DevoloDevice_1.ThermostatValveDevice();
                }
                else if (item.properties.deviceModelUID.indexOf('Smoke:Detector') > -1) {
                    device = new DevoloDevice_1.SmokeDetectorDevice();
                }
                else if (item.properties.deviceModelUID.indexOf('Room:Thermostat') > -1) {
                    device = new DevoloDevice_1.RoomThermostatDevice();
                }
                else if (item.properties.deviceModelUID.indexOf('Shutter') > -1) {
                    device = new DevoloDevice_1.ShutterDevice();
                }
                else {
                    console.log('Device', item.properties.deviceModelUID, 'is not supported (yet). Open an issue on github and ask for adding it.');
                    continue;
                }
                allElementUIDs = allElementUIDs.concat(item.properties.elementUIDs);
                if (item.properties.deviceModelUID.indexOf('Wall:Plug:Switch:and:Meter') > -1) {
                    allElementUIDs.push('ps.' + item.UID);
                }
                device.setParams(item.UID, item.properties.itemName, item.properties.deviceModelUID, item.properties.icon, item.properties.zoneId, item.properties.zone, item.properties.batteryLevel, (item.properties.batteryLow == false), null, [], new DevoloDevice_1.DeviceSettings());
                devices.push(device);
            }
            if (allElementUIDs.length == 0) {
                callback(null, devices);
                return;
            }
            self._api.fetchItems(allElementUIDs, function (err2, items2) {
                if (err2) {
                    callback(err2);
                    return;
                }
                if (items2) {
                    for (var i = 0; i < items2.length; i++) {
                        var item2 = items2[i];
                        //find suitable device for sensor
                        var device = null;
                        for (var k = 0; k < devices.length; k++) {
                            var deviceID = item2.UID;
                            if (deviceID.indexOf('#') > -1) {
                                deviceID = deviceID.substring(0, deviceID.indexOf('#'));
                            }
                            if (deviceID.endsWith(devices[k].id)) {
                                device = devices[k];
                                break;
                            }
                        }
                        var lastActivity = null;
                        var settings = new DevoloDevice_1.DeviceSettings();
                        if (item2.UID.indexOf('LastActivity') > -1) {
                            device.lastActivity = item2.properties.lastActivityTime;
                        }
                        else if (item2.UID.indexOf('ps.') > -1) {
                            settings.setParams(item2.properties.remoteSwitch);
                            device.settings = settings;
                        }
                        else {
                            if (item2.UID.indexOf('BinarySensor') > -1 || item2.UID.indexOf('MildewSensor') > -1) {
                                device.sensors.push(new DevoloSensor_1.BinarySensor(item2.UID, item2.properties.sensorType, item2.properties.state));
                            }
                            else if (item2.UID.indexOf('Meter') > -1) {
                                device.sensors.push(new DevoloSensor_1.MeterSensor(item2.UID, item2.properties.sensorType, item2.properties.currentValue, item2.properties.totalValue, item2.properties.sinceTime));
                            }
                            else if (item2.UID.indexOf('BinarySwitch') > -1) {
                                device.sensors.push(new DevoloSensor_1.BinarySwitch(item2.UID, item2.properties.sensorType, item2.properties.state, item2.properties.targetState));
                            }
                            else if (item2.UID.indexOf('MultiLevelSensor') > -1 || item2.UID.indexOf('HumidityBarZone') > -1 || item2.UID.indexOf('DewpointSensor') > -1 || item2.UID.indexOf('HumidityBarValue') > -1) {
                                device.sensors.push(new DevoloSensor_1.MultiLevelSensor(item2.UID, item2.properties.sensorType, item2.properties.value));
                            }
                            else if (item2.UID.indexOf('MultiLevelSwitch') > -1 || item2.UID.indexOf('Blinds') > -1) {
                                device.sensors.push(new DevoloSensor_1.MultiLevelSwitch(item2.UID, item2.properties.switchType, item2.properties.value, item2.properties.targetValue, item2.properties.min, item2.properties.max));
                            }
                        }
                    }
                }
                callback(null, devices);
            });
        });
    };
    ;
    Devolo.prototype.refreshDevice = function (device, callback) {
        this.getDevices([device.id], function (err, devices) {
            if (err) {
                callback(err);
                return;
            }
            callback(null, devices[0]);
        });
    };
    ;
    Devolo.prototype.getRules = function (callback) {
        var self = this;
        var rules = [];
        var allElementUIDs = [];
        self._api.fetchItems(["devolo.Services"], function (err, services) {
            if (err) {
                callback(err);
                return;
            }
            var serviceIDs = [];
            for (var i = 0; i < services[0].properties.serviceUIDs.length; i++) {
                serviceIDs.push(services[0].properties.serviceUIDs[i]);
            }
            self._api.fetchItems(serviceIDs, function (err2, services2) {
                if (err2) {
                    callback(err2);
                    return;
                }
                for (var i = 0; i < services2.length; i++) {
                    var service = services2[i];
                    allElementUIDs = allElementUIDs.concat(service.properties.elementUIDs);
                    var rule = new DevoloMisc_1.Rule();
                    rule.setParams(service.UID, service.properties.itemName, service.properties.description, false);
                    rules.push(rule);
                }
                self._api.fetchItems(allElementUIDs, function (err3, elements) {
                    if (err3) {
                        callback(err3);
                        return;
                    }
                    for (var i = 0; i < elements.length; i++) {
                        var element = elements[i];
                        //find suitable rule for sensor
                        var rule = null;
                        for (var i = 0; i < rules.length; i++) {
                            var id = rules[i].id.replace('Service', 'ServiceControl');
                            if (element.UID.indexOf(id) > -1) {
                                rule = rules[i];
                            }
                        }
                        rule.enabled = element.properties.enabled;
                    }
                    callback(null, rules);
                });
            });
        });
    };
    ;
    Devolo.prototype.getScenes = function (callback) {
        var self = this;
        var scenes = [];
        var itemsProcessed = 0;
        self._api.fetchItems(["devolo.Scene"], function (err, scenesData) {
            if (err) {
                callback(err);
                return;
            }
            var sceneIDs = [];
            for (var i = 0; i < scenesData[0].properties.sceneUIDs.length; i++) {
                sceneIDs.push(scenesData[0].properties.sceneUIDs[i]);
            }
            self._api.fetchItems(sceneIDs, function (err2, scenes2Data) {
                if (err2) {
                    callback(err2);
                    return;
                }
                if (scenes2Data) {
                    scenes2Data.forEach(function (sceneData, index, array) {
                        var scene = new DevoloMisc_1.Scene();
                        scene.setParams(sceneData.UID, sceneData.properties.itemName, sceneData.properties.description);
                        scenes.push(scene);
                        itemsProcessed++;
                        if (itemsProcessed === array.length) {
                            callback(null, scenes);
                        }
                    });
                }
                else {
                    callback(null, []);
                }
            });
        });
    };
    ;
    return Devolo;
}());
exports.Devolo = Devolo;
//export = Devolo;
