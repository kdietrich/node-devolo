import { DevoloOptions, Zone, Rule, Scene } from './DevoloMisc';
import { DevoloAPI } from './DevoloApi';
import { Device, DeviceSettings, SwitchMeterDevice, DoorWindowDevice, HumidityDevice, FloodDevice, MotionDevice, ThermostatValveDevice, SmokeDetectorDevice, RoomThermostatDevice, ShutterDevice, WallSwitchDevice, RemoteControlDevice, SirenDevice, RelayDevice, DimmerDevice, RelaySwitchXDevice, ZWeatherDevice, EverspringDimmerDevice } from './DevoloDevice';
import { Sensor, BinarySensor, MultiLevelSensor, MeterSensor, BinarySwitch, MultiLevelSwitch, RemoteControl } from './DevoloSensor';

export class Devolo {

    public _options: DevoloOptions;
    public version: string = '201707161504';
    private _api: DevoloAPI = DevoloAPI.getInstance();

    constructor(options: DevoloOptions, callback : (err: string, d?: Devolo) => void) {
        this._options = options;
        this._api.setOptions(options);


        var self = this;
        self.initAuth(function(err) {
            if(err) {
                callback(err); return;
            }
            self.auth(function(err) {
                if(err) {
                    callback(err); return;
                }
                self._api.connect(function(err) {
                    if(err) {
                        callback(err); return;
                    }
                    callback(null, self);
                });
            });
        })
    };

    initAuth(callback: (err: string) => void) : void {
//        console.log('initAuth')
        if(this._options.uuid && this._options.gateway && this._options.passkey) {
            callback(null);
            return;
        }
        var self = this;
        self._api.fetchUUID(function(err, uuid) {
            if(err) {
                callback(err); return;
            }
            if(!self._options.uuid)
                self._options.uuid = uuid;
            self._api.fetchGateway(function(err, gateway) {
                if(err) {
                    callback(err); return;
                }
                if(!self._options.gateway)
                    self._options.gateway = gateway;
                self._api.fetchPasskey(function(err, passkey) {
                    if(err) {
                        callback(err); return;
                    }
                    self._options.passkey = passkey;
                    callback(null);
                });
            });
        });
    };

    auth(callback: (err?:string) => void, forceRenew: boolean = false) : void {
//        console.log('auth');
        if(this._options.sessionid && !forceRenew) {
            callback();
            return;
        }
        var self = this;
        self._api.fetchSessionid(function(err, sessionid) {
            if(err) {
                callback(err); return;
            }
            self._options.sessionid = sessionid;
            callback();
        });
    };

    getZones(callback: (err: string, zones?: Zone[]) => void) : void {
//        console.log("getZones")
        var self = this;

        self._api.fetchItems(["devolo.Grouping"], function(err, items) {
            if(err) {
                callback(err); return;
            }
            var zones: Zone[] = [];
            if(items) {
                for(var i=0; i<items.length; i++) {
                    for(var j=0; j<items[i].properties.zones.length; j++) {
                        var zone = new Zone(items[i].properties.zones[j].id, items[i].properties.zones[j].name, items[i].properties.zones[j].deviceUIDs);
                        zones.push(zone);
                    }
                }
            }
            callback(null, zones);
        });
    };

    getAllDevices(callback: (err: string, devices?: Device[]) => void) : void {
        var self = this;
        this.getZones(function(err, zones) {
            if(err) {
                callback(err); return;
            }
            var deviceIDs: string[] = [];
            for(var i=0; i<zones.length; i++) {
                for(var j=0; j<zones[i].devices.length; j++) {
                    deviceIDs.push(zones[i].devices[j]);
                }
            }
            //console.log(deviceIDs); return;
            self.getDevices(deviceIDs, function(err, devices) {
                if(err) {
                    callback(err); return;
                }
                callback(null, devices);
            });
        });
    };

    getDevices(ids: string[], callback: (err: string, devices?: Device[]) => void) : void {
//        console.log("getDevices")
        var self = this;
        var allElementUIDs = [];
        var devices: Device[] = [];

        self._api.fetchItems(ids, function(err, items) {
            if(err) {
                callback(err); return;
            }

            for(var i=0; i<items.length; i++) {
                var item = items[i];
//               console.log(item);

                if(item.UID.indexOf('virtual:device') > -1 || item.properties.deviceModelUID == null) {
                    continue; //not supported yet
                }

                var device;
                if(item.properties.deviceModelUID.indexOf('Door/Window:Sensor') > -1) {
                    device = new DoorWindowDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Humidity:Sensor') > -1) {
                    device = new HumidityDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Flood:Sensor') > -1) {
                    device = new FloodDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Motion:Sensor') > -1) {
                    device = new MotionDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Wall:Plug:Switch:and:Meter') > -1) {
                    device = new SwitchMeterDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Thermostat:Valve') > -1) {
                    device = new ThermostatValveDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Smoke:Detector') > -1) {
                    device = new SmokeDetectorDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Room:Thermostat') > -1) {
                    device = new RoomThermostatDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Wall:Control') > -1) {
                    device = new WallSwitchDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Remote:Control') > -1) {
                    device = new RemoteControlDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Siren') > -1) {
                    device = new SirenDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Shutter') > -1) {
                    device = new ShutterDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Relay') > -1) {
                    device = new RelayDevice();
                }
                else if(item.properties.deviceModelUID.indexOf('Dimmer') > -1) {
                    device = new DimmerDevice();
                }
                // Qubino Flush [1|2|1D] Relay | https://products.z-wavealliance.org/regions/1/categories/16/products?company=331
                else if(((item.properties.deviceModelUID.indexOf('unk.model.On/Off:Power:Switch') > -1) ||
                         (item.properties.deviceModelUID.indexOf('unk.model.Netichome:D:Module') > -1)) && (
                            (item.properties.prodID == '0x0052' && item.properties.prodTypeID == '0x0002') ||    // Qubino Flush 1 Relay
                            (item.properties.prodID == '0x0051' && item.properties.prodTypeID == '0x0002') ||    // Qubino Flush 2 Relay
                            (item.properties.prodID == '0x0053' && item.properties.prodTypeID == '0x0002'))) {   // Qubino Flush 1D Relay
                                device = new RelaySwitchXDevice();
                }
                // Fibaro 2nd Gen | https://products.z-wavealliance.org/regions/1/categories/16/products?company=171
                else if((item.properties.deviceModelUID.indexOf('unk.model.On/Off:Power:Switch') > -1) && (
                            (item.properties.prodID == '0x1000' && item.properties.prodTypeID == '0x0403') ||    // Fibaro FGS-213 2nd Gen (1x)
                            (item.properties.prodID == '0x1000' && item.properties.prodTypeID == '0x0203'))) {   // Fibaro FGS-223 2nd Gen (2x)
                                device = new RelaySwitchXDevice();
                }

                // Fibaro Wall Plug | https://products.z-wavealliance.org/regions/1/categories/16/products?company=171
                else if((item.properties.deviceModelUID.indexOf('unk.model.On/Off:Power:Switch') > -1) && (
                            (item.properties.prodID == '0x1000' && item.properties.prodTypeID == '0x0600') ||    // Fibaro FGWPE/F-101
                            (item.properties.prodID == '0x1001' && item.properties.prodTypeID == '0x0602') ||    // Fibaro FGWPE/F-102
                            (item.properties.prodID == '0x1003' && item.properties.prodTypeID == '0x0602') ||    // Fibaro FGWPE/F-102
                            (item.properties.prodID == '0x1000' && item.properties.prodTypeID == '0x1801'))) {   // Fibaro FGWPG-111
                                device = new RelaySwitchXDevice();
                }

                // Fibaro 1st Gen | https://products.z-wavealliance.org/regions/1/categories/16/products?company=171
                else if(((item.properties.deviceModelUID.indexOf('devolo.model.Unknown:Device') > -1) ||
                         (item.properties.deviceModelUID.indexOf('unk.model.Unknown:Device') > -1)) && (
                            (item.properties.prodID == '0x0103' && item.properties.prodTypeID == '0x0400') ||    // Fibaro FGS-211 1st Gen (1x)
                            (item.properties.prodID == '0x0109' && item.properties.prodTypeID == '0x0400') ||    // Fibaro FGS-211 1st Gen (1x)
                            (item.properties.prodID == '0x100a' && item.properties.prodTypeID == '0x0400') ||    // Fibaro FGS-212 1st Gen (1x)
                            (item.properties.prodID == '0x1002' && item.properties.prodTypeID == '0x0402') ||    // Fibaro FGS-212 1st Gen (1x)
                            (item.properties.prodID == '0x0103' && item.properties.prodTypeID == '0x0200') ||    // Fibaro FGS-221 1st Gen (2x)
                            (item.properties.prodID == '0x0109' && item.properties.prodTypeID == '0x0200') ||    // Fibaro FGS-221 1st Gen (2x)
                            (item.properties.prodID == '0x100a' && item.properties.prodTypeID == '0x0200') ||    // Fibaro FGS-222 1st Gen (2x)
                            (item.properties.prodID == '0x1002' && item.properties.prodTypeID == '0x0202'))) {   // Fibaro FGS-222 1st Gen (2x)
                                device = new RelaySwitchXDevice();
                }
                // Everspring On/Off Switch AN158-2 | https://products.z-wavealliance.org/products/213?selectedFrequencyId=-1
                else if((item.properties.deviceModelUID.indexOf('unk.model.Unknown:Device') > -1) && (
                            (item.properties.prodID == '0x0002' && item.properties.prodTypeID == '0x0004'))) {
                                device = new RelaySwitchXDevice();
                }
                // Danfoss thermostat valve / radiator thermostat | https://products.z-wavealliance.org/regions/1/categories/10/products?company=3
                else if(((item.properties.deviceModelUID.indexOf('devolo.model.Unknown:Device') > -1) ||
                         (item.properties.deviceModelUID.indexOf('unk.model.Unknown:Device') > -1) ||
                         (item.properties.deviceModelUID.indexOf('unk.model.Danfoss:Thermostat') > -1)) && (
                            (item.properties.prodID == '0x0004' && item.properties.prodTypeID == '0x0005') ||
                            (item.properties.prodID == '0x0003' && item.properties.prodTypeID == '0x0005') ||
                            (item.properties.prodID == '0xA010' && item.properties.prodTypeID == '0x0248') ||
                            (item.properties.prodID == '0x0001' && item.properties.prodTypeID == '0x8005'))) {
                                device = new ThermostatValveDevice();
                }
                // Aeotec Siren Gen5 (ZW080-C15) | https://products.z-wavealliance.org/products/1136
                else if((item.properties.deviceModelUID.indexOf('devolo.model.Unknown:Device') > -1) && (
                            (item.properties.prodID == '0x0050' && item.properties.prodTypeID == '0x0004'))) {
                                device = new SirenDevice();
                }
                // Popp Z-Weather | https://products.z-wavealliance.org/products/2102
                else if((item.properties.deviceModelUID.indexOf('devolo.model.Unknown:Type:Device') > -1) && (
                            (item.properties.prodID == '0x0400' && item.properties.prodTypeID == '0x0100'))) {
                                device = new ZWeatherDevice();
                }
                // Fibaro Flood | https://github.com/kdietrich/homebridge-devolo/issues/58
                else if(((item.properties.deviceModelUID.indexOf('unk.model.Unknown:Device') > -1) ||
                         (item.properties.deviceModelUID.indexOf('unk.model.Fibaro:Flood') > -1)) && (
                            (item.properties.prodID == '0x1001' && item.properties.prodTypeID == '0x0b00') ||    // https://github.com/kdietrich/homebridge-devolo/issues/58
                            (item.properties.prodID == '0x1002' && item.properties.prodTypeID == '0x0b01') ||    // https://products.z-wavealliance.org/products/2791 | https://products.z-wavealliance.org/products/1354
                            (item.properties.prodID == '0x1003' && item.properties.prodTypeID == '0x0b01'))) {   // https://products.z-wavealliance.org/products/3327
                                device = new FloodDevice();
                }
                // Fibaro Roller Shutter | https://github.com/kdietrich/homebridge-devolo/issues/63
                else if((item.properties.deviceModelUID.indexOf('unk.model.Unknown:Device') > -1) && (
                            (item.properties.prodID == '0x1001' && item.properties.prodTypeID == '0x0301'))) {
                                device = new ShutterDevice();
                }
                // Everspring ST-814 | https://github.com/kdietrich/homebridge-devolo/issues/66
                else if((item.properties.deviceModelUID.indexOf('unk.model.Unknown:Device') > -1) && (
                            (item.properties.prodID == '0x0001' && item.properties.prodTypeID == '0x0006'))) {    // https://products.z-wavealliance.org/products/271
                                device = new HumidityDevice();
                }
                // Everspring AD-142 & Merten 508619 | https://github.com/kdietrich/homebridge-devolo/issues/66
                else if((item.properties.deviceModelUID.indexOf('unk.model.Unknown:Device') > -1) && (
                            (item.properties.prodID == '0x0001' && item.properties.prodTypeID == '0x8002') ||     // https://products.z-wavealliance.org/products/372
                            (item.properties.prodID == '0x0001' && item.properties.prodTypeID == '0x0003'))) {    // https://products.z-wavealliance.org/products/275
                                device = new EverspringDimmerDevice();
                }
                else {
                    console.log('Device > %s < is not supported (yet) or devolo has something changed. Open an issue on github and ask for adding it.\n> Model: %s\n> ProductID: %s\n> ProductTypeID: %s\n> Sensors: %s\n', item.properties.itemName, item.properties.deviceModelUID, item.properties.prodID, item.properties.prodTypeID, item.properties.elementUIDs);
                    continue;
                }

                allElementUIDs = allElementUIDs.concat(item.properties.elementUIDs);
                if(item.properties.deviceModelUID.indexOf('Wall:Plug:Switch:and:Meter') > -1) {
                    allElementUIDs.push('ps.' + item.UID);
                }

                device.setParams(item.UID,
                                 item.properties.itemName,
                                 item.properties.manID,
                                 item.properties.deviceModelUID,
                                 item.properties.icon,
                                 item.properties.zoneId,
                                 item.properties.zone,
                                 item.properties.batteryLevel as number,
                                 (item.properties.batteryLow==false),
                                 null,
                                 [],
                                 new DeviceSettings());

                devices.push(device);

            }
            if(allElementUIDs.length==0) {
                callback(null, devices);
                return;
            }

            self._api.fetchItems(allElementUIDs, function(err2, items2) {
                if(err2) {
                    callback(err2); return;
                }
                if(items2) {

                    for(var i=0; i<items2.length; i++) {
                        var item2 = items2[i];
                        //find suitable device for sensor
                        var device = null;
                        for(var k=0; k<devices.length; k++) {
                            var deviceID = item2.UID;
                            if(deviceID.indexOf('#') > -1) {
                               deviceID = deviceID.substring(0, deviceID.indexOf('#'));
                            }
                            if(deviceID.endsWith(devices[k].id)) {
                                device = devices[k];
                                break;
                            }
                        }

                        var lastActivity = null;
                        var settings: DeviceSettings = new DeviceSettings();

                        if(item2.UID.indexOf('LastActivity') > -1) {
                            device.lastActivity = item2.properties.lastActivityTime;
                        }
                        else if(item2.UID.indexOf('ps.') > -1) {
                            settings.setParams(item2.properties.remoteSwitch);
                            device.settings = settings;
                        }
                        else {
                            if(item2.UID.indexOf('BinarySensor') > -1 || item2.UID.indexOf('MildewSensor') > -1) {
                                device.sensors.push(new BinarySensor(
                                    item2.UID,
                                    item2.properties.sensorType,
                                    item2.properties.state
                                ));
                            }
                            else if(item2.UID.indexOf('Meter') > -1) {
                                device.sensors.push(new MeterSensor(
                                    item2.UID,
                                    item2.properties.sensorType,
                                    item2.properties.currentValue,
                                    item2.properties.totalValue,
                                    item2.properties.sinceTime
                                ));
                            }
                            else if(item2.UID.indexOf('BinarySwitch') > -1) {
                                device.sensors.push(new BinarySwitch(
                                    item2.UID,
                                    item2.properties.sensorType,
                                    item2.properties.state,
                                    item2.properties.targetState
                                ));
                                device.switchCount++;
                            }
                            else if(item2.UID.indexOf('MultiLevelSensor') > -1 || item2.UID.indexOf('HumidityBarZone') > -1 || item2.UID.indexOf('DewpointSensor') > -1 || item2.UID.indexOf('HumidityBarValue') > -1) {
                                device.sensors.push(new MultiLevelSensor(
                                    item2.UID,
                                    item2.properties.sensorType,
                                    item2.properties.value
                                ));
                            }
                            else if(item2.UID.indexOf('MultiLevelSwitch') > -1 || item2.UID.indexOf('Blinds') > -1 || item2.UID.indexOf('Dimmer') > -1) {
                                // console.log('-----> Sensor %s  %s', item2.UID, JSON.stringify(item2,null,2));
                                device.sensors.push(new MultiLevelSwitch(
                                    item2.UID,
                                    item2.properties.switchType,
                                    item2.properties.value,
                                    item2.properties.targetValue,
                                    item2.properties.min,
                                    item2.properties.max,
                                    item2.properties.operationStatus
                                ));
                            }
                            else if(item2.UID.indexOf('RemoteControl') > -1) {
                                device.sensors.push(new RemoteControl(
                                    item2.UID,
                                    'RemoteControl',
                                    item2.properties.keyCount,
                                    item2.properties.keyPressed
                                ));
                            }
                        }
                    }
                }
                callback(null, devices);
            });

        });

    };

    refreshDevice(device: Device, callback: (err: string, device?: Device) => void) : void {
        this.getDevices([device.id], function(err, devices) {
            if(err) {
                callback(err); return;
            }
            callback(null, devices[0]);
        });
    };

    getRules(callback: (err: string, rules?: Rule[]) => void) : void {
        var self = this;
        var rules: Rule[] = [];
        var allElementUIDs = [];
        self._api.fetchItems(["devolo.Services"], function(err, services) {
            if(err) {
                callback(err); return;
            }
            var serviceIDs: string[] = [];
            for(var i=0; i<services[0].properties.serviceUIDs.length; i++) {
                serviceIDs.push(services[0].properties.serviceUIDs[i]);
            }
            self._api.fetchItems(serviceIDs, function(err2, services2) {
                if(err2) {
                    callback(err2); return;
                }
                for(var i=0; i<services2.length; i++) {
                    var service = services2[i];
                    allElementUIDs = allElementUIDs.concat(service.properties.elementUIDs);

                    var rule = new Rule();
                    rule.setParams(service.UID,
                                   service.properties.itemName,
                                   service.properties.description,
                                   false);
                    rules.push(rule);

                }

                self._api.fetchItems(allElementUIDs, function(err3, elements) {
                    if(err3) {
                        callback(err3); return;
                    }
                    for(var i=0; i<elements.length; i++) {
                        var element = elements[i];
                        //find suitable rule for sensor
                        var rule = null;
                        for(var j=0; j<rules.length; j++) {
                            var id = rules[j].id.replace('Service', 'ServiceControl');
                            if(element.UID == id) {
                                rule = rules[j];
                            }
                        }
                        rule.enabled = element.properties.enabled;
                    }
                    callback(null, rules);
                });


            });
        });
    };

    getScenes(callback: (err: string, scenes?: Scene[]) => void) : void {
        var self = this;
        var scenes: Scene[] = [];
        var itemsProcessed = 0;
        self._api.fetchItems(["devolo.Scene"], function(err, scenesData) {
            if(err) {
                callback(err); return;
            }
            var sceneIDs: string[] = [];
            for(var i=0; i<scenesData[0].properties.sceneUIDs.length; i++) {
                sceneIDs.push(scenesData[0].properties.sceneUIDs[i]);
            }
            self._api.fetchItems(sceneIDs, function(err2, scenes2Data) {
                if(err2) {
                    callback(err2); return;
                }
                if(scenes2Data) {
                    scenes2Data.forEach(function(sceneData, index, array) {

                        var scene = new Scene();
                        scene.setParams(sceneData.UID,
                                        sceneData.properties.itemName,
                                        sceneData.properties.description);
                        scenes.push(scene);

                        itemsProcessed++;
                        if(itemsProcessed === array.length) {
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

    outputDebugLog(callback: (err?: string) => void) : void {
        var self = this;
        self._api.fetchItems(["devolo.Grouping"], function(err, zones) {
            if(err) {
                callback(err); return;
            }
            console.log('###### ZONES START ######');
            console.log(JSON.stringify(zones, null, 4));
            console.log('###### ZONES END ######');

            var deviceIDs: string[] = [];
            for(var i=0; i<zones[0].properties.zones.length; i++) {
                deviceIDs = deviceIDs.concat(zones[0].properties.zones[i].deviceUIDs);
            }
            self._api.fetchItems(deviceIDs, function(err, devices) {
                if(err) {
                    callback(err); return;
                }
                console.log('###### DEVICES START ######');
                console.log(JSON.stringify(devices, null, 4));
                console.log('###### DEVICES END ######');

                var sensorIDs: string[] = [];
                for(var i=0; i<devices.length; i++) {
                    sensorIDs = sensorIDs.concat(devices[i].properties.elementUIDs);
                    if(devices[i].properties.deviceModelUID) {
                        if(devices[i].properties.deviceModelUID.indexOf('Wall:Plug:Switch:and:Meter') > -1) {
                            sensorIDs.push('ps.' + devices[i].UID);
                        }
                    }
                }

                var settingsIDs: string[] = [];
                for(var i=0; i<devices.length; i++) {
                    settingsIDs = settingsIDs.concat(devices[i].properties.settingUIDs);
                }

                self._api.fetchItems(sensorIDs, function(err, sensors) {
                    if(err) {
                        callback(err); return;
                    }
                    console.log('###### SENSORS START ######');
                    console.log(JSON.stringify(sensors, null, 4));
                    console.log('###### SENSORS END ######');

                    self._api.fetchItems(settingsIDs, function(err, settings) {
                        if(err) {
                            callback(err); return;
                        }
                        console.log('###### SETTINGS START ######');
                        console.log(JSON.stringify(settings, null, 4));
                        console.log('###### SETTINGS END ######');

                        callback();
                    });
                });

            });
        });
    }
}
//export = Devolo;

