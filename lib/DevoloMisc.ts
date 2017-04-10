import { DevoloAPI } from './DevoloApi';

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

    setParams(id: string, name: string, description: string, enabled: boolean) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.enabled = enabled;
    }

    getEnabled() : boolean {
        return this.enabled;
    }

    setEnabled(enabled: boolean, callback: (err: string) => void) {
        this.enabled = enabled;
        callback('');
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