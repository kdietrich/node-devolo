"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var DevoloApi_1 = require("./DevoloApi");
var DevoloSensor_1 = require("./DevoloSensor");
var Device = (function () {
    function Device() {
    }
    Device.prototype.setParams = function (id, name, model, icon, zoneId, zone, batteryLevel, batteryLow, lastActivity, sensors) {
        this.id = id;
        this.name = name;
        this.model = model;
        this.icon = icon;
        this.zoneId = zoneId;
        this.zone = zone;
        this.batteryLevel = batteryLevel;
        this.batteryLow = batteryLow;
        this.lastActivity = lastActivity;
        this.sensors = sensors;
    };
    Device.prototype.turnOn = function (callback) {
        //        console.log("turnon");
        this.setState(1, callback, true);
    };
    Device.prototype.turnOff = function (callback) {
        //        console.log("turnoff");
        this.setState(0, callback, true);
    };
    Device.prototype.setState = function (state, callback, useAPI) {
        if (useAPI === void 0) { useAPI = false; }
        //        console.log("setState");
        var sendViaAPI = false;
        var sensor = this.getSensor(DevoloSensor_1.BinarySensor);
        if (!sensor) {
            sensor = this.getSensor(DevoloSensor_1.BinarySwitch);
            if (!sensor)
                callback('Device has no suitable sensor.');
            sendViaAPI = useAPI;
        }
        if (sensor.state === state) {
            callback(null);
            return;
        }
        if (sendViaAPI) {
            var operation = (state == 0) ? 'turnOff' : 'turnOn';
            var api = DevoloApi_1.DevoloAPI.getInstance();
            api.invokeOperation(sensor, operation, function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                sensor.state = state;
                callback(null);
            });
        }
        else {
            sensor.state = state;
            callback(null);
        }
    };
    Device.prototype.getState = function () {
        //        console.log("getState");
        var sensor = this.getSensor(DevoloSensor_1.BinarySensor);
        if (!sensor) {
            sensor = this.getSensor(DevoloSensor_1.BinarySwitch);
            if (!sensor)
                throw new Error('Device has no suitable sensor.');
        }
        return sensor.state;
    };
    Device.prototype.getValue = function (type) {
        //        console.log("getValue");
        var sensor = this.getSensor(DevoloSensor_1.MultiLevelSensor, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.value;
    };
    Device.prototype.setValue = function (type, value) {
        //        console.log("setValue");
        var sensor = this.getSensor(DevoloSensor_1.MultiLevelSensor, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        sensor.value = value;
    };
    Device.prototype.getCurrentValue = function (type) {
        //        console.log("getCurrentValue");
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.currentValue;
    };
    Device.prototype.getTotalValue = function (type) {
        //        console.log("getTotalValue");
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.totalValue;
    };
    Device.prototype.getSinceTime = function (type) {
        //        console.log("getSinceTime");
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.sinceTime;
    };
    Device.prototype.getBatteryLevel = function () {
        return this.batteryLevel;
    };
    Device.prototype.setBatteryLevel = function (batteryLevel) {
        this.batteryLevel = batteryLevel;
    };
    Device.prototype.getBatteryLow = function () {
        return this.batteryLow;
    };
    Device.prototype.setBatteryLow = function (batteryLow) {
        this.batteryLow = batteryLow;
    };
    Device.prototype.getSensor = function (classs, type) {
        //console.log("hasSensor..");
        for (var i = 0; i < this.sensors.length; i++) {
            var instance = this.sensors[i].constructor;
            if (instance.name == classs.name) {
                //        console.log("..true");
                if (!type || type == this.sensors[i].type)
                    return this.sensors[i];
            }
        }
        //console.log("..false");
        return null;
    };
    return Device;
}());
exports.Device = Device;
var SwitchMeterDevice = (function (_super) {
    __extends(SwitchMeterDevice, _super);
    function SwitchMeterDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SwitchMeterDevice;
}(Device));
exports.SwitchMeterDevice = SwitchMeterDevice;
var DoorWindowDevice = (function (_super) {
    __extends(DoorWindowDevice, _super);
    function DoorWindowDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return DoorWindowDevice;
}(Device));
exports.DoorWindowDevice = DoorWindowDevice;
var HumidityDevice = (function (_super) {
    __extends(HumidityDevice, _super);
    function HumidityDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HumidityDevice;
}(Device));
exports.HumidityDevice = HumidityDevice;
var FloodDevice = (function (_super) {
    __extends(FloodDevice, _super);
    function FloodDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return FloodDevice;
}(Device));
exports.FloodDevice = FloodDevice;
var MotionDevice = (function (_super) {
    __extends(MotionDevice, _super);
    function MotionDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return MotionDevice;
}(Device));
exports.MotionDevice = MotionDevice;
var SirenDevice = (function (_super) {
    __extends(SirenDevice, _super);
    function SirenDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SirenDevice;
}(Device));
exports.SirenDevice = SirenDevice;
