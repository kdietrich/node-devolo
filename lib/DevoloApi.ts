import { DevoloOptions, Zone } from './DevoloMisc';
import { Sensor, BinarySensor, MultiLevelSensor, MeterSensor, BinarySwitch, MultiLevelSwitch } from './DevoloSensor';
const WebSocket = require('ws');
import { EventEmitter } from 'events';

export class DevoloAPI {

    private static _instance:DevoloAPI = new DevoloAPI();
    private _apiHost:string = 'www.mydevolo.com';
    private _apiVersion:string ='/v1';
    private _options: DevoloOptions;
    public _ws; //wrong visibility
    private _interval;
    private _wsConnected:boolean = false;
    public _wsMessageEvents: EventEmitter = new EventEmitter();

    constructor() {
        if(DevoloAPI._instance) {
            throw new Error("Singleton...");
        }
        DevoloAPI._instance = this;
    }

    static getInstance() : DevoloAPI {
        return DevoloAPI._instance;
    }

    setOptions(options: DevoloOptions) {
        this._options = options;
    }

    call(method: string, path: string, data: any, callback: (err: string, data?: string, statusCode?: number, cookie?: string) => void, json: boolean, type: number, user?: string, pass?: string, cookie?: string) {

        var options = {
            'method': method,
            'hostname': (type==0) ? this._apiHost : this._options.centralHost,
            'path': (type==0) ? this._apiVersion + path : path,
            'headers': { }
        };

        if(user && pass) {
            options.headers['Authorization'] = 'Basic ' + new Buffer(user + ':' + pass).toString('base64');
        }

        if(cookie) {
            options.headers['Cookie'] = cookie;
        }

        var body = null;
        switch(method) {
            case 'GET':
                break;
            case 'POST':
                body = JSON.stringify(data);
                options.headers['Content-Type'] = 'application/json';
                options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        var protocol = (type==0) ? require('https') : require('http');

        var req = protocol.request(options, function (res) {
            if(!callback)
                return;

            var chunks = [];
            var cookieString = '';

            res.on('data', function (chunk) {
                chunks.push(chunk);
            });

            if(res.headers["set-cookie"]) {
                res.headers["set-cookie"].forEach(function(cookie) {
                    cookieString += cookie;
                });
            }

//1            console.log(options);
            res.on('end', function () {
                var body = Buffer.concat(chunks);
//1                console.log(body.toString());
                if(!json) {
                    callback(null, body.toString(), res.statusCode, cookieString);
                    return;
                }
                var jsonStr;
                try {
                    jsonStr = JSON.parse(body.toString());
                    callback(null, jsonStr, res.statusCode, cookieString);
                }
                catch(err) {
                    callback(err);
                }
            });

        });

        req.setTimeout(10000, function () {
            req.connection.destroy();
        });

        body && req.write(body, 'utf8');
        req.end();

        req.on('error', function (err) {
            if(callback)
                callback(err);
        });
    };

    fetchUUID(callback: (err: string, uuid?: string) => void) {
        this.call('GET', '/users/uuid', null, function(err, res: any, statusCode: number) {
            if(!callback) return;
            if(err) { callback(err); return; }
            if(statusCode != 200) {
                callback('Authorization failed. Check email and password.'); return;
            }
            callback(null, res.uuid);
        }, true, 0, this._options.email, this._options.password);
    };

    fetchGateway(callback: (err: string, gateway?: string) => void) {
        this.call('GET', '/users/' + this._options.uuid + '/hc/gateways', null, function(err, res: any, statusCode: number) {
            if(!callback) return;
            if(err) { callback(err); return; }
            if(statusCode != 200) {
                callback('Could not fetch gateway. Try again later.'); return;
            }
     //       console.log(res);
            var gatewayHref = res.items[0].href;
            callback(null, gatewayHref.split("/gateways/").pop());
        }, true, 0, this._options.email, this._options.password);
    };

    fetchPasskey(callback: (err: string, passkey?: string) => void) {
        this.call('GET', '/users/' + this._options.uuid + '/hc/gateways/' + this._options.gateway, null, function(err, res: any, statusCode: number) {
            if(!callback) return;
            if(err) { callback(err); return; }
            if(statusCode != 200) {
                callback('Could not fetch passkey. Try again later.'); return;
            }
            callback(null, res.localPasskey);
        }, true, 0, this._options.email, this._options.password);
    };

    fetchSessionid(callback: (err: string, sessionid?: string) => void) {
        var self = this;
        this.call('GET', '/dhlp/portal/light', null, function(err, res: any, statusCode: number) {
            if(!callback) return;
            if(err) { callback(err); return; }
            if(statusCode != 200) {
                callback('Could not get dhlp portal. Try again later.'); return;
            }
            var link = res.link;
            var token = res.link.split("?token=").pop();
            self.call('GET', '/dhlp/portal/light/?token=' + token, null, function(err, res, statusCode, cookies) {
                if(err) { callback(err); return; }
                if(!cookies) {
                    callback('Could not get session. Try again later.'); return;
                }
                var sessionid = cookies.split("JSESSIONID=").pop();
                sessionid = sessionid.split("; ").shift();
                callback(null, sessionid);
            }, false, 1, self._options.uuid, self._options.passkey);
        }, true, 1, this._options.uuid, this._options.passkey);
    };

    fetchItems(deviceids: string[], callback: (err: string, items?: any) => void) { //Zones, Devices, Sensors
        var data = {
            jsonrpc: '2.0',
            method: 'FIM/getFunctionalItems',
            params: [
                deviceids,
                0
            ]
        };
        this.call('POST', '/remote/json-rpc', data, function(err, res: any) {
            if(!callback) return;
            if(err || !res) { callback(err); return; }
            if(res.error) { callback(res.error.message); return; }
            if(!res.result || !res.result.items) { callback('Items missing at device ' + deviceids + ' > ' + res); return; }
            callback(null, res.result.items);
        }, true, 1, null, null, 'JSESSIONID='+this._options.sessionid);
    };

    invokeOperation(sensor: Sensor, operation: string, callback: (err?: string) => void, value: number[] = [], ) {
        var data = {
            jsonrpc: '2.0',
            method: 'FIM/invokeOperation',
            params: [
                sensor.id,
                operation,
                value
            ]
        };
        this.call('POST', '/remote/json-rpc', data, function(err, res: any) {
            if(!callback) return;
            if(err) { callback(err); return; }
            callback();
        }, true, 1, null, null, 'JSESSIONID='+this._options.sessionid);
    };

    connect(callback: (err?:string) => void) {
        var self = this;
        console.log('Trying to connect to socket.');
        this._ws = new WebSocket('ws://' + this._options.centralHost + '/remote/events/?topics=com/prosyst/mbs/services/fim/FunctionalItemEvent/PROPERTY_CHANGED');
        this._ws.on('open', function() {
            console.log('Websocket open');
            self._wsConnected = true;
            self.startHeartbeatHandler();
            callback();
        });
        this._ws.on('message', function(message) {
            var jsonStr;
            try {
                jsonStr = JSON.parse(message);
            }
            catch(err) {
                throw err;
            }
            self._wsMessageEvents.emit('message', jsonStr);
        });
        this._ws.on('error', function() {
            self.stopHeartbeatHandler();
            console.log('Could not connect to socket. Retrying..');
            callback('Could not connect to socket. Retrying..');
            self._ws.terminate();
            setTimeout(function() {
                self.connect(function(err) {});
                return;
            }, 1000);
        });
    };

    startHeartbeatHandler() : void {
        var self = this;
        this._ws.on('pong', function() {
            self._wsConnected = true;
        });
        setTimeout(function() {
            console.log('Force closing socket after 25 minutes. Trying to reconnect...');
            self.reconnect();
        }, 1500000);
        clearInterval(this._interval);
        this._interval = setInterval(function ping() {
            if(self._ws && !self._wsConnected) {
                console.log('Connection to socket lost. Trying to reconnect...');
                self.reconnect();
                return;
            }
            self._wsConnected = false;
            self._ws.ping('', false, true);
        }, 10000);
    };

    stopHeartbeatHandler() : void {
        clearInterval(this._interval);
    };

    reconnect() : void {
        this.stopHeartbeatHandler();
        console.log('Reconnecting...');
        this._ws.terminate();
        this.connect(function(err) {});
    };



};