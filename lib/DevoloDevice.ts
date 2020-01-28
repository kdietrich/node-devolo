import { DevoloAPI } from './DevoloApi';
import { Sensor, BinarySensor, MultiLevelSensor, MeterSensor, BinarySwitch, MultiLevelSwitch, RemoteControl } from './DevoloSensor';
import { EventEmitter } from 'events';

export class DeviceSettings {
    stateSwitchable: boolean = true;

    setParams(stateSwitchable: boolean) {
        this.stateSwitchable = stateSwitchable;
    }

}

export abstract class Device {

    id: string;
    name: string;
    manID: string;
    model: string;
    icon: string;
    zoneId: string;
    zone: string;
    batteryLevel: number;
    batteryLow: boolean;
    lastActivity: number;
    sensors: Sensor[];
    settings: DeviceSettings;
    events: EventEmitter = new EventEmitter();
    switchCount: number = 0;
    isListening: boolean = false;

    setParams(id: string, name: string, manID: string, model: string, icon: string, zoneId: string, zone: string, batteryLevel: number, batteryLow: boolean, lastActivity: number, sensors: Sensor[], settings: DeviceSettings) {
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
    }

    listen() : void {
        var self = this;

        if(self.isListening)
            return;

        var api:DevoloAPI = DevoloAPI.getInstance();
        api._wsMessageEvents.on('message', function(jsonStr) {
        //api._ws.on('message', function(message) {


            if(jsonStr.properties.uid) {
                var sensor = self.getSensorByID(jsonStr.properties.uid);
                if(sensor) {
                    var num = parseInt(sensor.id.split("#").pop());
                    if(!num)
                        num = 1;
                    if(jsonStr.properties['property.name']==='state') {
                        self.onStateChanged(jsonStr.properties['property.value.new'], num);
                    }
                    else if(jsonStr.properties['property.name']==='currentValue') {
                        self.onCurrentValueChanged(sensor.type, jsonStr.properties['property.value.new'], num);
                    }
                    else if(jsonStr.properties['property.name']==='totalValue') {
                        self.onTotalValueChanged(sensor.type, jsonStr.properties['property.value.new'], num);
                    }
                    else if(jsonStr.properties['property.name']==='targetValue') {
                        self.onTargetValueChanged(sensor.type, jsonStr.properties['property.value.new']);
                    }
                    else if(jsonStr.properties['property.name']==='sinceTime') {
                        self.onSinceTimeChanged(sensor.type, jsonStr.properties['property.value.new'], num);
                    }
                    else if(jsonStr.properties['property.name']==='value') {
                        self.onValueChanged(sensor.type, jsonStr.properties['property.value.new']);
                    }
                    else if(jsonStr.properties['property.name']==='batteryLevel') {
                        self.onBatteryLevelChanged(jsonStr.properties['property.value.new']);
                    }
                    else if(jsonStr.properties['property.name']==='batteryLow') {
                        self.onBatteryLowChanged(jsonStr.properties['property.value.new']);
                    }
                    else if(jsonStr.properties['property.name']==='keyPressed') {
                        self.onKeyPressedChanged(jsonStr.properties['property.value.new']);
                    }
                    else if(jsonStr.properties['property.name']==='operationStatus') {
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
    }

    turnOn(callback: (err?:string) => void, num?: number) {
        if(!this.settings.stateSwitchable) {
            callback('Switching of device is disabled.');
            return;
        }
        this.setState(1, callback, true, num);
    }

    turnOff(callback: (err:string) => void, num?: number) {
//        console.log("turnoff");
        if(!this.settings.stateSwitchable) {
            callback('Switching of device is disabled.');
            return;
        }
        this.setState(0, callback, true, num);
    }

    setState(state: number, callback: (err:string) => void, useAPI: boolean=false, num?: number) {
//        console.log("setState");
        var sendViaAPI: boolean = useAPI;
        if(!num)
            num = null;
        var sensor: BinarySensor = this.getSensor(BinarySwitch, null, num) as BinarySensor;
        if(!sensor) {
            sensor = this.getSensor(BinarySwitch, null, null) as BinarySensor;
            if(!sensor) {
                sensor = this.getSensor(BinarySensor, null, num) as BinarySensor;
                if(!sensor) {
                    sensor = this.getSensor(BinarySensor, null, null) as BinarySensor;
                    if(!sensor) {
                        //console.log('Device has no suitable sensor.')
                        callback('Device has no suitable sensor.'); return;
                    }
                }
                sendViaAPI = false;
            }
        }
        if(sensor.state === state) {
            callback(null); return;
        }
        if(this.settings.stateSwitchable && sendViaAPI) {
            var operation = (state==0) ? 'turnOff' : 'turnOn';
            var api:DevoloAPI = DevoloAPI.getInstance();
            api.invokeOperation(sensor, operation, function(err) {
                if(err) {
                    callback(err); return;
                }
                sensor.state = state;
                callback(null);
            });
        }
        else {
            sensor.state = state;
            callback(null);
        }
    }

    getState(num?: number) : number {
//        console.log("getState");
        var sensor: BinarySensor = this.getSensor(BinarySwitch, null, num) as BinarySensor;
        if(!sensor) {
            sensor = this.getSensor(BinarySensor, null, num) as BinarySensor;
            if(!sensor)
                throw new Error('Device has no suitable sensor.');
        }
        return sensor.state;
    }

    getValue(type:string) : number {
//        console.log("getValue");
        var sensor: MultiLevelSensor = this.getSensor(MultiLevelSensor, type) as MultiLevelSensor;
        if(!sensor) {
            sensor = this.getSensor(MultiLevelSwitch, type) as MultiLevelSensor;
            if(!sensor)
                throw new Error('Device has no suitable sensor.');
        }
        return sensor.value;
    }

    setValue(type: string, value: number) : void {
//        console.log("setValue");
        var sensor: MultiLevelSensor = this.getSensor(MultiLevelSensor, type) as MultiLevelSensor;
        if(!sensor) {
            sensor = this.getSensor(MultiLevelSwitch, type) as MultiLevelSensor;
            if(!sensor)
                throw new Error('Device has no suitable sensor.');
        }
        sensor.value = value;
    }

    getTargetValue(type:string) : number {
//        console.log("getTargetValue");
        var sensor: MultiLevelSwitch = this.getSensor(MultiLevelSwitch, type) as MultiLevelSwitch;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.targetValue;
    }

    setTargetValue(type: string, targetValue: number, callback: (err:string) => void, useAPI: boolean=false) {
//        console.log("setTargetValue");
        var sendViaAPI: boolean = useAPI;
        var sensor: MultiLevelSwitch = this.getSensor(MultiLevelSwitch, type) as MultiLevelSwitch;
        if(!sensor) {
            callback('Device has no suitable sensor.');
            return;
        }
        if(sensor.targetValue === targetValue) {
            callback(null); return;
        }
        if(sendViaAPI) {
            var operation = 'sendValue';
            var api:DevoloAPI = DevoloAPI.getInstance();
            api.invokeOperation(sensor, operation, function(err) {
                if(err) {
                    callback(err); return;
                }
                sensor.targetValue = targetValue;
                callback(null);
            }, [targetValue]);
        }
        else {
            sensor.targetValue = targetValue;
            callback(null);
        }
    }

    getOperationStatus(type:string) : number {
        console.log("getOperationStatus");
        var sensor: MultiLevelSwitch = this.getSensor(MultiLevelSwitch, type) as MultiLevelSwitch;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.operationStatus;
    }
        
    setOperationStatus(type: string, operationStatus: number, callback: (err:string) => void, useAPI: boolean=false) {
        console.log("setOperationStatus");
        var sendViaAPI: boolean = useAPI;
        var sensor: MultiLevelSwitch = this.getSensor(MultiLevelSwitch, type) as MultiLevelSwitch;
        if(!sensor) {
            callback('Device has no suitable sensor.');
            return;
        }
        if(sensor.operationStatus === operationStatus) {
            callback(null); return;
        }
        if(sendViaAPI) {
            var operation = 'sendValue';
            var api:DevoloAPI = DevoloAPI.getInstance();
            api.invokeOperation(sensor, operation, function(err) {
                if(err) {
                    callback(err); return;
                }
                sensor.operationStatus = operationStatus;
                callback(null);
            }, [operationStatus]);
        }
        else {
            sensor.operationStatus = operationStatus;
            callback(null);
        }
    }
        

    getCurrentValue(type:string, num?:number) : number {
//        console.log("getCurrentValue");
        var sensor: MeterSensor = this.getSensor(MeterSensor, type, num) as MeterSensor;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.currentValue;
    }

    setCurrentValue(type: string, currentValue: number) : void {
        var sensor: MeterSensor = this.getSensor(MeterSensor, type) as MeterSensor;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        sensor.currentValue = currentValue;
    }

    setTotalValue(type: string, totalValue: number) : void {
        var sensor: MeterSensor = this.getSensor(MeterSensor, type) as MeterSensor;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        sensor.totalValue = totalValue;
    }

    setSinceTime(type: string, sinceTime: number) : void {
        var sensor: MeterSensor = this.getSensor(MeterSensor, type) as MeterSensor;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        sensor.sinceTime = sinceTime;
    }

    getTotalValue(type:string, num?:number) : number {
//        console.log("getTotalValue");
        var sensor: MeterSensor = this.getSensor(MeterSensor, type, num) as MeterSensor;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.totalValue;
    }

    getSinceTime(type:string, num?:number) : number {
//        console.log("getSinceTime");
        var sensor: MeterSensor = this.getSensor(MeterSensor, type, num) as MeterSensor;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.sinceTime;
    }

    getBatteryLevel() : number {
        return this.batteryLevel;
    }

    setBatteryLevel(batteryLevel: number) : void {
        this.batteryLevel = batteryLevel;
    }

    getBatteryLow() : boolean {
        return this.batteryLow;
    }

    setBatteryLow(batteryLow: boolean) : void {
        this.batteryLow = batteryLow;
    }

    setKeyPressed(keyPressed: number) : void {
        var sensor: RemoteControl = this.getSensor(RemoteControl) as RemoteControl;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        sensor.keyPressed = keyPressed;
    }

    getKeyCount() : number {
        var sensor: RemoteControl = this.getSensor(RemoteControl) as RemoteControl;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.keyCount;
    }

    onStateChanged(state: number, num: number) : void {
        var self = this;
        this.setState(state, function(err) {
            self.events.emit('onStateChanged', state, num);
        }, false, num);
    }

    onValueChanged(type: string, value: number) : void {
        this.setValue(type, value);
        this.events.emit('onValueChanged', type, value);
    }

    onCurrentValueChanged(type: string, value: number, num: number) : void {
        this.setCurrentValue(type, value);
        this.events.emit('onCurrentValueChanged', type, value, num);
    }

    onTotalValueChanged(type: string, value: number, num: number) : void {
        this.setTotalValue(type, value);
        this.events.emit('onTotalValueChanged', type, value, num);
    }

    onTargetValueChanged(type: string, value: number) : void {
        var self = this;
        this.setTargetValue(type, value, function(err) {
            self.events.emit('onTargetValueChanged', type, value);
        });
    }

    onSinceTimeChanged(type: string, value: number, num: number) : void {
        this.setSinceTime(type, value);
        this.events.emit('onSinceTimeChanged', type, value, num);
    }

    onBatteryLevelChanged(value: number) : void {
        this.setBatteryLevel(value);
        this.events.emit('onBatteryLevelChanged', value);
    }

    onBatteryLowChanged(value: boolean) : void {
        this.setBatteryLow(value);
        this.events.emit('onBatteryLowChanged', value);
    }

    onKeyPressedChanged(value: number) : void {
        this.setKeyPressed(value);
        this.events.emit('onKeyPressedChanged', value);
    }

    onOperationStatusChanged(type: string, value: number) : void {
        var self = this;
        this.setOperationStatus(type, value, function(err) {
            self.events.emit('onOperationStatusChanged', type, value);
        });
    }

    private getSensor(classs: any, type?: string, num?: number) : Sensor {
        //console.log("hasSensor..");
        for(var i=0; i<this.sensors.length; i++) {
            let instance: any = this.sensors[i].constructor;
            if(instance.name == classs.name) {
        //        console.log("..true");
                if(!type || type == this.sensors[i].type)
                    if(!num || this.switchCount==1 || this.sensors[i].id.indexOf('#'+num)>-1)
                        return this.sensors[i];
            }
        }
        //console.log("..false");
        return null;
    }

    private getSensorByID(id: string) : Sensor {
        for(var i=0; i<this.sensors.length; i++) {
            if(this.sensors[i].id === id)
                return this.sensors[i];
        }
        return null;
    }
}

export class SwitchMeterDevice extends Device { }
export class DoorWindowDevice extends Device { }
export class HumidityDevice extends Device { }
export class FloodDevice extends Device { }
export class MotionDevice extends Device { }
export class ThermostatValveDevice extends Device { }
export class SmokeDetectorDevice extends Device { }
export class RoomThermostatDevice extends Device { }
export class ShutterDevice extends Device { }
export class WallSwitchDevice extends Device { }
export class RemoteControlDevice extends Device { }
export class SirenDevice extends Device { }
export class RelayDevice extends Device { }
export class DimmerDevice extends Device { }
export class RelaySwitchXDevice extends Device { }
export class ZWeatherDevice extends Device { }