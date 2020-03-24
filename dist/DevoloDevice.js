"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var DevoloApi_1 = require("./DevoloApi");
var DevoloSensor_1 = require("./DevoloSensor");
var events_1 = require("events");
var DeviceSettings = /** @class */ (function () {
    function DeviceSettings() {
        this.stateSwitchable = true;
    }
    DeviceSettings.prototype.setParams = function (stateSwitchable) {
        this.stateSwitchable = stateSwitchable;
    };
    return DeviceSettings;
}());
exports.DeviceSettings = DeviceSettings;
var Device = /** @class */ (function () {
    function Device() {
        this.events = new events_1.EventEmitter();
        this.switchCount = 0;
        this.isListening = false;
    }
    Device.prototype.setParams = function (id, name, manID, model, icon, zoneId, zone, batteryLevel, batteryLow, lastActivity, sensors, settings) {
        this.id = id;
        this.name = name;
        this.manID = manID;
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
    Device.prototype.listen = function () {
        var self = this;
        if (self.isListening)
            return;
        var api = DevoloApi_1.DevoloAPI.getInstance();
        api._wsMessageEvents.on('message', function (jsonStr) {
            //api._ws.on('message', function(message) {
            if (jsonStr.properties.uid) {
                var sensor = self.getSensorByID(jsonStr.properties.uid);
                if (sensor) {
                    var num = parseInt(sensor.id.split("#").pop());
                    if (!num)
                        num = 1;
                    if (jsonStr.properties['property.name'] === 'state') {
                        self.onStateChanged(jsonStr.properties['property.value.new'], num);
                    }
                    else if (jsonStr.properties['property.name'] === 'currentValue') {
                        self.onCurrentValueChanged(sensor.type, jsonStr.properties['property.value.new'], num);
                    }
                    else if (jsonStr.properties['property.name'] === 'totalValue') {
                        self.onTotalValueChanged(sensor.type, jsonStr.properties['property.value.new'], num);
                    }
                    else if (jsonStr.properties['property.name'] === 'targetValue') {
                        self.onTargetValueChanged(sensor.type, jsonStr.properties['property.value.new']);
                    }
                    else if (jsonStr.properties['property.name'] === 'sinceTime') {
                        self.onSinceTimeChanged(sensor.type, jsonStr.properties['property.value.new'], num);
                    }
                    else if (jsonStr.properties['property.name'] === 'value') {
                        self.onValueChanged(sensor.type, jsonStr.properties['property.value.new']);
                    }
                    else if (jsonStr.properties['property.name'] === 'batteryLevel') {
                        self.onBatteryLevelChanged(jsonStr.properties['property.value.new']);
                    }
                    else if (jsonStr.properties['property.name'] === 'batteryLow') {
                        self.onBatteryLowChanged(jsonStr.properties['property.value.new']);
                    }
                    else if (jsonStr.properties['property.name'] === 'keyPressed') {
                        self.onKeyPressedChanged(jsonStr.properties['property.value.new']);
                    }
                    else if (jsonStr.properties['property.name'] === 'operationStatus') {
                        //console.log('--> operationStatus %s', JSON.stringify(jsonStr,null,2));
                        self.onOperationStatusChanged(sensor.type, jsonStr.properties['property.value.new'] ? jsonStr.properties['property.value.new'].status : -1);
                    }
                    else {
                        //console.log('%s COULDNT FIND PROPERTY: %s for sensor %s (type[%s]) - new value would be: %s',(self.constructor as any).name, jsonStr.properties['property.name'], sensor, sensor.type, jsonStr.properties['property.value.new']);
                        //console.log('--> RAW JSON %s', JSON.stringify(jsonStr,null,2));
                    }
                }
                else {
                    // console.log('%s COULDNT FIND SENSOR: %s', (self.constructor as any).name, jsonStr.properties.uid);
                }
            }
        });
        self.isListening = true;
    };
    Device.prototype.turnOn = function (callback, num) {
        if (!this.settings.stateSwitchable) {
            callback('Switching of device is disabled.');
            return;
        }
        this.setState(1, callback, true, num);
    };
    Device.prototype.turnOff = function (callback, num) {
        //        console.log("turnoff");
        if (!this.settings.stateSwitchable) {
            callback('Switching of device is disabled.');
            return;
        }
        this.setState(0, callback, true, num);
    };
    Device.prototype.setState = function (state, callback, useAPI, num) {
        if (useAPI === void 0) { useAPI = false; }
        //        console.log("setState");
        var sendViaAPI = useAPI;
        if (!num)
            num = null;
        var sensor = this.getSensor(DevoloSensor_1.BinarySwitch, null, num);
        if (!sensor) {
            sensor = this.getSensor(DevoloSensor_1.BinarySwitch, null, null);
            if (!sensor) {
                sensor = this.getSensor(DevoloSensor_1.BinarySensor, null, num);
                if (!sensor) {
                    sensor = this.getSensor(DevoloSensor_1.BinarySensor, null, null);
                    if (!sensor) {
                        //console.log('Device has no suitable sensor.')
                        callback('Device has no suitable sensor.');
                        return;
                    }
                }
                sendViaAPI = false;
            }
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
    Device.prototype.getState = function (num) {
        //        console.log("getState");
        var sensor = this.getSensor(DevoloSensor_1.BinarySwitch, null, num);
        if (!sensor) {
            sensor = this.getSensor(DevoloSensor_1.BinarySensor, null, num);
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
    Device.prototype.getOperationStatus = function (type) {
        console.log("getOperationStatus");
        var sensor = this.getSensor(DevoloSensor_1.MultiLevelSwitch, type);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.operationStatus;
    };
    Device.prototype.setOperationStatus = function (type, operationStatus, callback, useAPI) {
        if (useAPI === void 0) { useAPI = false; }
        console.log("setOperationStatus");
        var sendViaAPI = useAPI;
        var sensor = this.getSensor(DevoloSensor_1.MultiLevelSwitch, type);
        if (!sensor) {
            callback('Device has no suitable sensor.');
            return;
        }
        if (sensor.operationStatus === operationStatus) {
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
                sensor.operationStatus = operationStatus;
                callback(null);
            }, [operationStatus]);
        }
        else {
            sensor.operationStatus = operationStatus;
            callback(null);
        }
    };
    Device.prototype.getCurrentValue = function (type, num) {
        //        console.log("getCurrentValue");
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type, num);
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
    Device.prototype.getTotalValue = function (type, num) {
        //        console.log("getTotalValue");
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type, num);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.totalValue;
    };
    Device.prototype.getSinceTime = function (type, num) {
        //        console.log("getSinceTime");
        var sensor = this.getSensor(DevoloSensor_1.MeterSensor, type, num);
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
    Device.prototype.setKeyPressed = function (keyPressed) {
        var sensor = this.getSensor(DevoloSensor_1.RemoteControl);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        sensor.keyPressed = keyPressed;
    };
    Device.prototype.getKeyCount = function () {
        var sensor = this.getSensor(DevoloSensor_1.RemoteControl);
        if (!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.keyCount;
    };
    Device.prototype.onStateChanged = function (state, num) {
        var self = this;
        this.setState(state, function (err) {
            self.events.emit('onStateChanged', state, num);
        }, false, num);
    };
    Device.prototype.onValueChanged = function (type, value) {
        this.setValue(type, value);
        this.events.emit('onValueChanged', type, value);
    };
    Device.prototype.onCurrentValueChanged = function (type, value, num) {
        this.setCurrentValue(type, value);
        this.events.emit('onCurrentValueChanged', type, value, num);
    };
    Device.prototype.onTotalValueChanged = function (type, value, num) {
        this.setTotalValue(type, value);
        this.events.emit('onTotalValueChanged', type, value, num);
    };
    Device.prototype.onTargetValueChanged = function (type, value) {
        var self = this;
        this.setTargetValue(type, value, function (err) {
            self.events.emit('onTargetValueChanged', type, value);
        });
    };
    Device.prototype.onSinceTimeChanged = function (type, value, num) {
        this.setSinceTime(type, value);
        this.events.emit('onSinceTimeChanged', type, value, num);
    };
    Device.prototype.onBatteryLevelChanged = function (value) {
        this.setBatteryLevel(value);
        this.events.emit('onBatteryLevelChanged', value);
    };
    Device.prototype.onBatteryLowChanged = function (value) {
        this.setBatteryLow(value);
        this.events.emit('onBatteryLowChanged', value);
    };
    Device.prototype.onKeyPressedChanged = function (value) {
        this.setKeyPressed(value);
        this.events.emit('onKeyPressedChanged', value);
    };
    Device.prototype.onOperationStatusChanged = function (type, value) {
        var self = this;
        this.setOperationStatus(type, value, function (err) {
            self.events.emit('onOperationStatusChanged', type, value);
        });
    };
    Device.prototype.getSensor = function (classs, type, num) {
        //console.log("hasSensor..");
        for (var i = 0; i < this.sensors.length; i++) {
            var instance = this.sensors[i].constructor;
            if (instance.name == classs.name) {
                //        console.log("..true");
                if (!type || type == this.sensors[i].type)
                    if (!num || this.switchCount == 1 || this.sensors[i].id.indexOf('#' + num) > -1)
                        return this.sensors[i];
            }
        }
        //console.log("..false");
        return null;
    };
    Device.prototype.getSensorByID = function (id) {
        for (var i = 0; i < this.sensors.length; i++) {
            if (this.sensors[i].id === id)
                return this.sensors[i];
        }
        return null;
    };
    return Device;
}());
exports.Device = Device;
var SwitchMeterDevice = /** @class */ (function (_super) {
    __extends(SwitchMeterDevice, _super);
    function SwitchMeterDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SwitchMeterDevice;
}(Device));
exports.SwitchMeterDevice = SwitchMeterDevice;
var DoorWindowDevice = /** @class */ (function (_super) {
    __extends(DoorWindowDevice, _super);
    function DoorWindowDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return DoorWindowDevice;
}(Device));
exports.DoorWindowDevice = DoorWindowDevice;
var HumidityDevice = /** @class */ (function (_super) {
    __extends(HumidityDevice, _super);
    function HumidityDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HumidityDevice;
}(Device));
exports.HumidityDevice = HumidityDevice;
var FloodDevice = /** @class */ (function (_super) {
    __extends(FloodDevice, _super);
    function FloodDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return FloodDevice;
}(Device));
exports.FloodDevice = FloodDevice;
var MotionDevice = /** @class */ (function (_super) {
    __extends(MotionDevice, _super);
    function MotionDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return MotionDevice;
}(Device));
exports.MotionDevice = MotionDevice;
var ThermostatValveDevice = /** @class */ (function (_super) {
    __extends(ThermostatValveDevice, _super);
    function ThermostatValveDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ThermostatValveDevice;
}(Device));
exports.ThermostatValveDevice = ThermostatValveDevice;
var SmokeDetectorDevice = /** @class */ (function (_super) {
    __extends(SmokeDetectorDevice, _super);
    function SmokeDetectorDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SmokeDetectorDevice;
}(Device));
exports.SmokeDetectorDevice = SmokeDetectorDevice;
var RoomThermostatDevice = /** @class */ (function (_super) {
    __extends(RoomThermostatDevice, _super);
    function RoomThermostatDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RoomThermostatDevice;
}(Device));
exports.RoomThermostatDevice = RoomThermostatDevice;
var ShutterDevice = /** @class */ (function (_super) {
    __extends(ShutterDevice, _super);
    function ShutterDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ShutterDevice;
}(Device));
exports.ShutterDevice = ShutterDevice;
var WallSwitchDevice = /** @class */ (function (_super) {
    __extends(WallSwitchDevice, _super);
    function WallSwitchDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return WallSwitchDevice;
}(Device));
exports.WallSwitchDevice = WallSwitchDevice;
var RemoteControlDevice = /** @class */ (function (_super) {
    __extends(RemoteControlDevice, _super);
    function RemoteControlDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RemoteControlDevice;
}(Device));
exports.RemoteControlDevice = RemoteControlDevice;
var SirenDevice = /** @class */ (function (_super) {
    __extends(SirenDevice, _super);
    function SirenDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SirenDevice;
}(Device));
exports.SirenDevice = SirenDevice;
var RelayDevice = /** @class */ (function (_super) {
    __extends(RelayDevice, _super);
    function RelayDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RelayDevice;
}(Device));
exports.RelayDevice = RelayDevice;
var DimmerDevice = /** @class */ (function (_super) {
    __extends(DimmerDevice, _super);
    function DimmerDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return DimmerDevice;
}(Device));
exports.DimmerDevice = DimmerDevice;
var RelaySwitchXDevice = /** @class */ (function (_super) {
    __extends(RelaySwitchXDevice, _super);
    function RelaySwitchXDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return RelaySwitchXDevice;
}(Device));
exports.RelaySwitchXDevice = RelaySwitchXDevice;
var ZWeatherDevice = /** @class */ (function (_super) {
    __extends(ZWeatherDevice, _super);
    function ZWeatherDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ZWeatherDevice;
}(Device));
exports.ZWeatherDevice = ZWeatherDevice;
var EverspringDimmerDevice = /** @class */ (function (_super) {
    __extends(EverspringDimmerDevice, _super);
    function EverspringDimmerDevice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return EverspringDimmerDevice;
}(Device));
exports.EverspringDimmerDevice = EverspringDimmerDevice;
