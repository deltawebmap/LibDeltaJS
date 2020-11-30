import DeltaObject from './DeltaObject.js';
import DeltaEventDispatcher from './DeltaEventDispatcher.js';

export default class DeltaOpcodeSock extends DeltaObject {

    constructor(conn, url) {
        super(conn);
        this._sock = null;
        this._sockUrl = url;
        this._fails = 0;
        this._registeredSockOpcodes = {};
        this._msgQueue = [];
        this._ready = false;

        //Events
        this.OnConnectedEvent = new DeltaEventDispatcher();
        this.OnDisconnectedEvent = new DeltaEventDispatcher();

        //Register defaults
        this.RegisterCommandHandler("CONNECTION_INFO", (p) => {
            //Sent when we first connect. Log, then send login info
            this.Log("COMMAND", "Connected to RPC server version " + p.app_version_major + "." + p.app_version_minor + ". Sending login details...");
            this.SendMessage("LOGIN", {
                "access_token": this.conn.GetAccessToken()
            });
        });
        this.RegisterCommandHandler("LOGIN_STATUS", (p) => {
            //Sent when we finish logging in
            if(p.success) {
                this.Log("LOGIN", "Login success.");
                this._FinishConnect();
            } else {
                this.Log("LOGIN", "Login failed: " + p.message);
                this._sock.close();
            }
        });
    }

    OpenConnection() {
        this._ConnectSock();
    }

    RegisterCommandHandler(opcode, handler) {
        this._registeredSockOpcodes[opcode] = handler;
    }

    SendMessage(opcode, data) {
        //Create payload
        var p = {
            "opcode": opcode,
            "payload": data
        };

        //Send or queue
        var m = JSON.stringify(p);
        if(this._ready || opcode == "LOGIN") {
            this._sock.send(m);
        } else {
            this._msgQueue.push(m);
        }
    }

    _ConnectSock() {
        //Create connection
        this._sock = new WebSocket(this._sockUrl);
        this.Log("OPEN", "Attempting to connect to RPC...");

        //Add events
        this._sock.addEventListener('message', (m) => this._OnCommand(m));
        this._sock.addEventListener('close', () => this._OnRPCClose());

        //Add timeout
        this._connectTimeout = window.setTimeout( () => this._OnRPCTimeout(), 6000);
    }

    _OnRPCTimeout() {
        this.Log("TIMEOUT", "RPC connection timed out.");
        this.connectTimeout = null;
        this.sock.close();
    }

    _OnRPCClose() {
        this._fails += 1;
        this.Log("CLOSE", "RPC closed. Fail #" + this._fails);

        //Stop timeout
        if (this._connectTimeout != null) {
            clearTimeout(this._connectTimeout);
        }

        //Calculate the amount of time to wait to reconnect. If this is one of the first fails, we'll wait a short amount of time. If we haven't been able to connect for a while, wait longer
        var time = 2000;
        if (this._fails > 2) {
            time = 4000;
        }
        if (this._fails > 3) {
            time = 10000;
        }
        if (this._fails > 5) {
            time = 20000;
        }
        if (this._fails > 8) {
            time = 40000;
        }

        //Set reconnect timer
        this.Log("CLOSE", "Attempting to reconnect in " + time + "ms.");
        window.setTimeout(() => this._ConnectSock(), time);

        //Send event
        this.OnDisconnectedEvent.Fire({});
    }

    _OnCommand(evt) {
        var d = JSON.parse(evt.data);
        if (this._registeredSockOpcodes[d.opcode] != null) {
            this._registeredSockOpcodes[d.opcode](d.payload, d.opcode);
        }
    }

    _FinishConnect() {
        this._fails = 0;
        if (this._connectTimeout != null) {
            clearTimeout(this._connectTimeout);
        }
        this.OnConnectedEvent.Fire({});
        this._ready = true;
        for(var i = 0; i<this._msgQueue.length; i+=1) {
            this._sock.send(this._msgQueue[i]);
        }
        this._msgQueue = [];
    }

}