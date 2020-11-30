import DeltaObject from '../../DeltaObject.js';
import DeltaOpcodeSock from '../../DeltaOpcodeWebsocket.js';

export default class DeltaContentServer extends DeltaObject {

    constructor(conn, hostname) {
        super(conn);
        this.hostname = hostname;
        this._rpcCommitBindings = {}; //Keys in format "{GUILD ID}-{COMMIT TYPE}"
        this._sock = new DeltaOpcodeSock(conn, "wss://" + this.hostname + "/events");
        this._sock.OpenConnection();
        this._sock.RegisterCommandHandler("COMMIT_CREATE", (evt, opcode) => this._OnCommitEvent(evt, opcode));
        this._sock.RegisterCommandHandler("COMMIT_PUT_CONTENT", (evt, opcode) => this._OnCommitEvent(evt, opcode));
        this._sock.RegisterCommandHandler("COMMIT_FINALIZE", (evt, opcode) => this._OnCommitEvent(evt, opcode));
    }

    GetServerUrlBase(serverId) {
        return "https://" + this.hostname + "/" + serverId;
    }

    RegisterServer(serverId) {
        this._sock.SendMessage("REGISTER_GUILD", {
            "guild_id": serverId
        });
    }

    /*
        Binds callback for commit events from the RPC

        @serverId: The guild ID
        @commitType: The number representation of the bucket type
        @callback: A callback fired, in this format:
            ([string] command, [object] data)
    */
    BindRpcCommitEvents(serverId, commitType, callback) {
        this._rpcCommitBindings[serverId + "-" + commitType] = callback;
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

    async GetServerBucketJson(serverId, bucketName, limit, offset) {
        var d = await this.conn.WebGetJson(this.GetServerUrlBase(serverId) + "/buckets/" + bucketName + "?format=json&offset=" + offset + "&limit=" + limit, {});
        return d.data;
    }

    _OnCommitEvent(evt, opcode) {
        //Get data
        var guildId = evt.server_id;
        var commitType = evt.commit_type;
        var key = guildId + "-" + commitType;

        //Send
        if(this._rpcCommitBindings[key] != null) {
            this._rpcCommitBindings[key](opcode, evt);
        }
    }

}