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