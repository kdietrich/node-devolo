import { DevoloAPI } from './DevoloApi';
import { Sensor, BinarySensor, MultiLevelSensor, MeterSensor, BinarySwitch, MultiLevelSwitch } from './DevoloSensor';

export class DeviceSettings {
    stateSwitchable: boolean = true;

    setParams(stateSwitchable: boolean) {
        this.stateSwitchable = stateSwitchable;
    }

}

export abstract class Device {

    id: string;
    name: string;
    model: string;
    icon: string;
    zoneId: string;
    zone: string;
    batteryLevel: number;
    batteryLow: boolean;
    lastActivity: number;
    sensors: Sensor[];
    settings: DeviceSettings;

    setParams(id: string, name: string, model: string, icon: string, zoneId: string, zone: string, batteryLevel: number, batteryLow: boolean, lastActivity: number, sensors: Sensor[], settings: DeviceSettings) {
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
    }

    turnOn(callback: (err?:string) => void) {
//        console.log("turnon");
        if(!this.settings.stateSwitchable) {
            callback('Switching of device is disabled.');
            return;
        }
        this.setState(1, callback, true);
    }

    turnOff(callback: (err:string) => void) {
//        console.log("turnoff");
        if(!this.settings.stateSwitchable) {
            callback('Switching of device is disabled.');
            return;
        }
        this.setState(0, callback, true);
    }

    setState(state: number, callback: (err:string) => void, useAPI: boolean=false) {
//        console.log("setState");
        var sendViaAPI: boolean = false;
        var sensor: BinarySensor = this.getSensor(BinarySensor) as BinarySensor;
        if(!sensor) {
            sensor = this.getSensor(BinarySwitch) as BinarySensor;
            if(!sensor)
                callback('Device has no suitable sensor.');
            sendViaAPI = useAPI;
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

    getState() : number {
//        console.log("getState");
        var sensor: BinarySensor = this.getSensor(BinarySensor) as BinarySensor;
        if(!sensor) {
            sensor = this.getSensor(BinarySwitch) as BinarySensor;
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

    getCurrentValue(type:string) : number {
//        console.log("getCurrentValue");
        var sensor: MeterSensor = this.getSensor(MeterSensor, type) as MeterSensor;
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

    getTotalValue(type:string) : number {
//        console.log("getTotalValue");
        var sensor: MeterSensor = this.getSensor(MeterSensor, type) as MeterSensor;
        if(!sensor)
            throw new Error('Device has no suitable sensor.');
        return sensor.totalValue;
    }

    getSinceTime(type:string) : number {
//        console.log("getSinceTime");
        var sensor: MeterSensor = this.getSensor(MeterSensor, type) as MeterSensor;
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

    private getSensor(classs: any, type?: string) : Sensor {
        //console.log("hasSensor..");
        for(var i=0; i<this.sensors.length; i++) {
            let instance: any = this.sensors[i].constructor;
            if(instance.name == classs.name) {
        //        console.log("..true");
                if(!type || type == this.sensors[i].type)
                    return this.sensors[i];
            }
        }
        //console.log("..false");
        return null;
    }
}

export class SwitchMeterDevice extends Device { }
export class DoorWindowDevice extends Device { }
export class HumidityDevice extends Device { }
export class FloodDevice extends Device { }
export class MotionDevice extends Device { }
export class ThermostatValveDevice extends Device { }