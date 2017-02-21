"use strict";
var Zone = (function () {
    function Zone(id, name, devices) {
        this.id = id;
        this.name = name;
        this.devices = devices;
    }
    return Zone;
}());
exports.Zone = Zone;
