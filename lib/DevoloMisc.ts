import { DevoloAPI } from './DevoloApi';
import { EventEmitter } from 'events';

EventEmitter.defaultMaxListeners = 100;

export interface DevoloOptions {
    email: string;
    password: string;
    centralHost: string;
    uuid: string;
    gateway: string;
    passkey: string;
    sessionid: string;
}

export class Zone {
    id: string;
    name: string;
    devices: string[];
    constructor(id: string, name: string, devices: string[]) {
        this.id = id;
        this.name = name;
        this.devices = devices;
    }
}

export class Rule {

    id: string;
    name: string;
    description: string;
    enabled: boolean;
    events: EventEmitter = new EventEmitter();

    setParams(id: string, name: string, description: string, enabled: boolean) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.enabled = enabled;
    }

    listen() : void {
        var self = this;

        var api:DevoloAPI = DevoloAPI.getInstance();
        api._ws.on('message', function(message) {
            var jsonStr;
            try {
                jsonStr = JSON.parse(message);
            }
            catch(err) {
                throw err;
            }

            if(jsonStr.properties.uid) {
                if(jsonStr.properties['property.name']==='enabled') {
                    self.onEnabledChanged(jsonStr.properties['property.value.new']);
                }
                else {
                    //console.log('COULDNT FIND RULE PROPERTY:', jsonStr.properties['property.name']);
                }
            }
        });
    }

    getEnabled() : boolean {
        return this.enabled;
    }

    setEnabled(enabled: boolean, callback: (err: string) => void) {
        this.enabled = enabled;
        callback('');
    }

    onEnabledChanged(value: boolean) : void {
        var self = this;
        this.setEnabled(value, function() {
            self.events.emit('onEnabledChanged', value);
        });
    }
}

export class Scene {

    id: string;
    name: string;
    description: string;

    setParams(id: string, name: string, description: string) {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    invoke(callback: (err:string) => void) : void {
        var api:DevoloAPI = DevoloAPI.getInstance();
        var scene = JSON.parse(JSON.stringify(this));
        scene.id = scene.id.replace('Scene:', 'SceneControl:');
        api.invokeOperation(scene, 'start', function(err) {
            if(err) {
                callback(err); return;
            }
            callback(null);
        });
    }
}