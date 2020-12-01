import DeltaObject from '../../DeltaObject.js';
import DeltaOpcodeSock from '../../DeltaOpcodeWebsocket.js';

export default class DeltaContentServer extends DeltaObject {

    constructor(conn, hostname) {
        super(conn);
        this.hostname = hostname;
        this._registeredGuildIds = [];
        this._rpcCommitBindings = {}; //Keys in format "{GUILD ID}-{BUCKET NAME}"
        this._sock = new DeltaOpcodeSock(conn, "wss://" + this.hostname + "/events");
        this._sock.OpenConnection();
        this._sock.RegisterCommandHandler("COMMIT_CREATE", (evt, opcode) => this._OnCommitEvent(evt, opcode));
        this._sock.RegisterCommandHandler("COMMIT_PUT_CONTENT", (evt, opcode) => this._OnCommitEvent(evt, opcode));
        this._sock.RegisterCommandHandler("COMMIT_FINALIZE", (evt, opcode) => this._OnCommitEvent(evt, opcode));
        this._sock.OnConnectedEvent.Subscribe(() => {
            //Resubscribe servers
            for(var i = 0; i<this._registeredGuildIds.length; i+=1) {
                this._sock.SendMessage("REGISTER_GUILD", {
                    "guild_id": serverId
                });
            }
        });
    }

    GetServerUrlBase(serverId) {
        return "https://" + this.hostname + "/" + serverId;
    }

    RegisterServer(serverId) {
        this._sock.SendMessage("REGISTER_GUILD", {
            "guild_id": serverId
        });
        this._registeredGuildIds.push(serverId);
    }

    /*
        Binds callback for commit events from the RPC

        @serverId: The guild ID
        @bucketName: Name of the bucket being used
        @callback: A callback fired, in this format:
            ([string] command, [object] data)
    */
    BindRpcCommitEvents(serverId, bucketName, callback) {
        this._rpcCommitBindings[serverId + "-" + bucketName] = callback;
    }

    async GetServerBucketList(serverId) {
        return await this.conn.WebGetJson(this.GetServerUrlBase(serverId) + "/bucket_list", {});
    }

    async GetServerTotalContentCount(serverId) {
        var index = await this.GetServerBucketList(serverId);
        var c = 0;
        for (var i = 0; i<index.buckets.length; i+=1) {
            c += index.buckets[i].allowed_count;
        }
        return c;
    }

    _OnCommitEvent(evt, opcode) {
        //Get data
        var key = evt.server_id + "-" + evt.bucket_name;

        //Send
        if(this._rpcCommitBindings[key] != null) {
            this._rpcCommitBindings[key](opcode, evt);
        }
    }

}