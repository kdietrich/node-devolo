"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var DevoloApi_1 = require("./DevoloApi");
var DevoloSensor_1 = require("./DevoloSensor");
var DeviceSettings = (function () {
    function DeviceSettings() {
        this.stateSwitchable = true;
    }
    DeviceSettings.prototype.setParams = function (stateSwitchable) {
        this.stateSwitchable = stateSwitchable;
    };
    return DeviceSettings;
}());
exports.DeviceSettings = DeviceSettings;
var Device = (function () {
    function Device() {
    }
    Device.prototype.setParams = function (id, name, model, icon, zoneId, zone, batteryLevel, batteryLow, lastActivity, sensors, settings) {
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
        this.settings = settings;
    };
    Device.prototype.turnOn = function (callback) {
        if (!this.settings.stateSwitchable) {
            callback('Switching of device is disabled.');
            return;
        }
        this.setState(1, callback, true);
    };
    Device.prototype.turnOff = function (callback) {
        //        console.log("turnoff");
        if (!this.settings.stateSwitchable) {
            callback('Switching of device is disabled.');
            return;
        }
        this.setState(0, callback, true);
    };
    Device.prototype.setState = function (state, callback, useAPI) {
        if (useAPI === void 0) { useAPI = false; }
        //        console.log("setState");
        var sendViaAPI = useAPI;
        var sensor = this.getSensor(DevoloSensor_1.BinarySwitch);
        if (!sensor) {
            sensor = this.getSensor(DevoloSensor_1.BinarySensor);
            if (!sensor) {
                callback('Device has no suitable sensor.');
                return;
            }
            sendViaAPI = false;
        }
        if (sensor.state === state) {
            callback(null);
            return;
        }
        if (this.settings.stateSwitchable && sendViaAPI) {
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
        var sensor = this.getSensor(DevoloSensor_1.BinarySwitch);
        if (!sensor) {
            sensor = this.getSensor(DevoloSensor_1.BinarySensor);
            if (!sensor)
                throw new Error('Device has no suitable sensor.');
        }
        return sensor.state;
    };
    Device.prototype.getValue = function (type) {
        //        console.log("getValue");
        var sensor = this.getSensor(DevoloSensor_1.MultiLevelSensor, type);
        if (!sensor) {
            sensor = this.getSensor(DevoloSensor_1.MultiLevelSwitch, type);
            if (!sensor)
                throw new Error('Device has no suitable sensor.');
        }
        return sensor.value;
    };
    Device.prototype.setValue = function (type, value) {
        //        console.log("setValue");
        var sensor = this.getSensor(DevoloSensor_1.MultiLevelSensor, type);
        if (!sensor) {
            sensor = this.getSensor(DevoloSensor_1.MultiLevelSwitch, type);
            if (!sensor)
                throw new Error('Device has no suitable sensor.');
        }
        sensor.value = value;
    };
    Device.prototype.getTargetValue = function (type) {
        //        console.log("getTargetValue");
        var sensor = this.getSensor(DevoloSensor_1.MultiLevelSwitch, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.targetValue;
    };
    Device.prototype.setTargetValue = function (type, targetValue, callback, useAPI) {
        if (useAPI === void 0) { useAPI = false; }
        //        console.log("setTargetValue");
        var sendViaAPI = useAPI;
        var sensor = this.getSensor(DevoloSensor_1.MultiLevelSwitch, type);
        if (!sensor) {
            callback('Device has no suitable sensor.');
            return;
        }
        if (sensor.targetValue === targetValue) {
            callback(null);
            return;
        }
        if (sendViaAPI) {
            var operation = 'sendValue';
            var api = DevoloApi_1.DevoloAPI.getInstance();
            api.invokeOperation(sensor, operation, function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                sensor.targetValue = targetValue;
                callback(null);
            }, [targetValue]);
        }
        else {
            sensor.targetValue = targetValue;
            callback(null);
        }
    };
    Device.prototype.getCurrentValue = function (type) {
        //        console.log("getCurrentValue");
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.currentValue;
    };
    Device.prototype.setCurrentValue = function (type, currentValue) {
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        sensor.currentValue = currentValue;
    };
    Device.prototype.setTotalValue = function (type, totalValue) {
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        sensor.totalValue = totalValue;
    };
    Device.prototype.setSinceTime = function (type, sinceTime) {
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        sensor.sinceTime = sinceTime;
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
var ThermostatValveDevice = (function (_super) {
    __extends(ThermostatValveDevice, _super);
    function ThermostatValveDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ThermostatValveDevice;
}(Device));
exports.ThermostatValveDevice = ThermostatValveDevice;
var SmokeDetectorDevice = (function (_super) {
    __extends(SmokeDetectorDevice, _super);
    function SmokeDetectorDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SmokeDetectorDevice;
}(Device));
exports.SmokeDetectorDevice = SmokeDetectorDevice;
var RoomThermostatDevice = (function (_super) {
    __extends(RoomThermostatDevice, _super);
    function RoomThermostatDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RoomThermostatDevice;
}(Device));
exports.RoomThermostatDevice = RoomThermostatDevice;
