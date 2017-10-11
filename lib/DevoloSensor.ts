export abstract class Sensor {
    id: string;
    type: string;
    constructor(id: string, type: string) {
        this.id = id;
        this.type = type;
    }
}

export class BinarySensor extends Sensor {
    state: number;
    constructor(id: string, type: string, state: number) {
        super(id, type);
        this.state = state;
    }
}

export class MultiLevelSensor extends Sensor {
    value: number;
    constructor(id: string, type: string, value: number) {
        super(id, type);
        this.value = value;
    }
}

export class MeterSensor extends Sensor {
    currentValue: number;
    totalValue: number;
    sinceTime: number;
    constructor(id: string, type: string, currentValue: number, totalValue: number, sinceTime: number) {
        super(id, type);
        this.currentValue = currentValue;
        this.totalValue = totalValue;
        this.sinceTime = sinceTime;
    }
}

export class BinarySwitch extends BinarySensor {
    targetState: number;
    constructor(id: string, type: string, state: number, targetState: number) {
        super(id, type, state);
        this.targetState = targetState;
    }
}

export class MultiLevelSwitch extends MultiLevelSensor {
    targetValue: number;
    min: number;
    max: number;
    constructor(id: string, type: string, value: number, targetValue: number, min: number, max: number) {
        super(id, type, value);
        this.targetValue = targetValue;
        this.min = min;
        this.max = max;
    }
}

export class RemoteControl extends Sensor {
    keyCount: number;
    keyPressed: number;
    constructor(id: string, type: string, keyCount: number, keyPressed: number) {
        super(id, type);
        this.keyCount = keyCount;
        this.keyPressed = keyPressed;
    }
}
