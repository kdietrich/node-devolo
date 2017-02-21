"use strict";
var DevoloMisc_1 = require("./DevoloMisc");
var DevoloApi_1 = require("./DevoloApi");
var DevoloDevice_1 = require("./DevoloDevice");
var DevoloSensor_1 = require("./DevoloSensor");
var Devolo = (function () {
    function Devolo(options, callback) {
        this.version = '201702202047';
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
                callback(null, self);
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
    Devolo.prototype.auth = function (callback) {
        //        console.log('auth');
        if (this._options.sessionid) {
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
        self._api.fetchItems(ids, function (err, items) {
            if (err) {
                callback(err);
                return;
            }
            var devices = [];
            var itemsProcessed = 0;
            items.forEach(function (item, index, array) {
                //                console.log(items); return;
                if (item.UID.indexOf('virtual:device') > -1) {
                    itemsProcessed++;
                    return; //not supported yet
                }
                var sensors = [];
                var lastActivity = null;
                self._api.fetchItems(item.properties.elementUIDs, function (err2, items2) {
                    if (err2) {
                        callback(err2);
                        return;
                    }
                    if (items2) {
                        //                        console.log(items2); return;
                        items2.forEach(function (item2) {
                            if (item2.UID.indexOf('LastActivity') > -1) {
                                lastActivity = item2.properties.lastActivityTime;
                            }
                            else {
                                if (item2.UID.indexOf('BinarySensor') > -1 || item2.UID.indexOf('MildewSensor') > -1) {
                                    sensors.push(new DevoloSensor_1.BinarySensor(item2.UID, item2.properties.sensorType, item2.properties.state));
                                }
                                else if (item2.UID.indexOf('Meter') > -1) {
                                    sensors.push(new DevoloSensor_1.MeterSensor(item2.UID, item2.properties.sensorType, item2.properties.currentValue, item2.properties.totalValue, item2.properties.sinceTime));
                                }
                                else if (item2.UID.indexOf('BinarySwitch') > -1) {
                                    sensors.push(new DevoloSensor_1.BinarySwitch(item2.UID, item2.properties.sensorType, item2.properties.state, item2.properties.targetState));
                                }
                                else if (item2.UID.indexOf('MultiLevelSensor') > -1 || item2.UID.indexOf('HumidityBarZone') > -1 || item2.UID.indexOf('DewpointSensor') > -1 || item2.UID.indexOf('HumidityBarValue') > -1) {
                                    sensors.push(new DevoloSensor_1.MultiLevelSensor(item2.UID, item2.properties.sensorType, item2.properties.value));
                                }
                                else if (item2.UID.indexOf('MultiLevelSwitch') > -1) {
                                    sensors.push(new DevoloSensor_1.MultiLevelSwitch(item2.UID, item2.properties.sensorType, item2.properties.value, item2.properties.targetValue, item2.properties.min, item2.properties.max));
                                }
                            }
                        });
                    }
                    itemsProcessed++;
                    if (itemsProcessed === array.length) {
                        callback(null, devices);
                    }
                });
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
                else if (item.properties.deviceModelUID.indexOf('Siren') > -1) {
                    device = new DevoloDevice_1.SirenDevice();
                }
                else {
                    return;
                }
                device.setParams(item.UID, item.properties.itemName, item.properties.deviceModelUID, item.properties.icon, item.properties.zoneId, item.properties.zone, item.properties.batteryLevel, (item.properties.batteryLow == false), lastActivity, sensors);
                //var device = Object.create(window[deviceClassName].prototype);
                /*device.constructor.apply(device, item.UID,
                                                 item.properties.itemName,
                                                 item.properties.deviceModelUID,
                                                 item.properties.icon,
                                                 item.properties.zoneId,
                                                 item.properties.zone,
                                                 item.properties.batteryLevel,
                                                 item.properties.batteryLow,
                                                 lastActivity,
                                                 sensors
                );*/
                devices.push(device);
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
    return Devolo;
}());
exports.Devolo = Devolo;
//export = Devolo;
