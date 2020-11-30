//Manages events

export default class DeltaEventDispatcher {

    constructor() {
        this._subscriptions = [];
    }

    Fire(params) {
        for(var i = 0; i<this._subscriptions.length; i+=1) {
            this._subscriptions[i](params);
        }
    }
    
    Subscribe(c) {
        this._subscriptions.push(c);
    }

}