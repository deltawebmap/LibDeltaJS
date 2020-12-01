import DeltaStreamingContentBase from '../DeltaStreamingContentBase.js'

export default class DeltaContentServerBucketBase extends DeltaStreamingContentBase {

    constructor(conn, contentServer, guildId, bucketName) {
        super(conn);
        this.guildId = guildId;
        this.contentServer = contentServer;
        this.bucketName = bucketName;
        this.content = []; //All content
        this._map = {}; //Holds the same as this.content, but holds them by their UUID instead
        this._latestFullCommitId = null; //A string, set by the first COMMIT_CREATE command
        this._waitingItems = []; //The items that have been added via RPC and are waiting for us to go and update them
        this._commitUpdatedUUIDs = []; //The UUIDs applied in the latest commit. We'll use this to clear out ones not updated
        this._workingCommits = {}; //The working commits, by their TYPE
        this._updateTimer = window.setInterval(() => this.ApplyNewChanges(), 10000); //Periodically go through and apply new updates to cut down on CPU usage
        this.contentServer._sock.OnDisconnectedEvent.Subscribe(() => {
            //The RPC server lost connection. Since we might miss UUIDs and remove the wrong creatures, play it safe and reset the last commit ID
            this._latestFullCommitId = null;
            this.Log("ContentServerBucketRPC", "Lost connection to server bucket, resetting last commit ID.");
        });
    }

    /*
        [ABSTRACT] Returns the unique identifier (UUID) for an object

        @o: The object to query
    */
    GetObjectUUID(o) {
        throw "This must be overridden.";
    }

    /*
        Returns the URL to download from

        @format: The format tag to request from the server. Usually dwf_v1
        @page: The page offset
        @limit: The max number of entries to return. If this is more than what is returned, we assume we are at the end.
    */
    GetChunkURL(format, page, limit) {
        return this.contentServer.GetServerUrlBase(this.guildId) + "/buckets/" + this.bucketName + "?format=" + format + "&skip=" + (page * limit) + "&limit=" + limit;
    }

    /*
        Downloads a chunk of content and returns it as an array.

        @page: The page offset
        @limit: The max number of entries to return. If this is more than what is returned, we assume we are at the end.
    */
    async DownloadChunk(page, limit) {
        //Build URL
        var url = this.GetChunkURL("dwf_v1", page, limit);

        //Request
        var content = await this.conn.WebGetDWF(url);
        return content.content;
    }

    /*
        Does the initial downloading of data and also subscribes to events

        @progress: A callback to be periodically fired as content is downloaded in the following form:
            ([int] New progress)
    */
    async PrepareBucket(progress) {
        //Download old content
        var content = await this.DownloadContent(progress);
        this._AddContent(content);

        //Bind RPC events
        this.contentServer.BindRpcCommitEvents(this.guildId, this.bucketName, (opcode, data) => {
            switch(opcode) {
                case "COMMIT_CREATE": this._OnRpcCmdCommitCreated(data); break;
                case "COMMIT_PUT_CONTENT": this._OnRpcCmdCommitPutContent(data); break;
                case "COMMIT_FINALIZE": this._OnRpcCmdCommitFinalized(data); break;
            }
        });
    }

    /*
        Applies any new items added via RPC
    */
    ApplyNewChanges() {
        //If there are no new changes, abort
        if(this._waitingItems.length == 0) {
            return 0;
        }

        //Add and clear
        var count = this._waitingItems.length;
        this._AddContent(this._waitingItems);
        this._waitingItems = [];

        //Log
        this.Log("ContentServerBucketRPC", "Applied " + count + " RPC changes globally for " + this.bucketName + ".");
        return count;
    }

    _GetWorkingCommit(type) {
        return this._workingCommits[type];
    }

    _AddWorkingCommit(type, id) {
        this._workingCommits[type] = {
            "type": type,
            "id": id,
            "updated_uuids": []
        }
        return this._GetWorkingCommit(type);
    }

    _AddContent(c) {
        //Loop through and generate metadata and add
        for(var i = 0; i<c.length; i+=1) {
            //Create metadata
            var uuid = this.GetObjectUUID(c[i]);
            c[i]._metadata = {
                "uuid": uuid,
                "commit_id": c[i].commit_id,
                "commit_type": c[i].commit_type
            };

            //Add or update
            if(this._map[uuid] == null) {
                //Add
                this.content.push(c[i]);
                this._map[uuid] = c[i];
            } else {
                //Update all properties to keep references
                var k = Object.keys(c[i]);
                for(var j = 0; j<k.length; j += 1) {
                    this._map[uuid][k[j]] = c[i][k[j]];
                }
            }
        }
    }

    _RemoveContent(c) {
        //Loop through each
        for(var i = 0; i<c.length; i+=1) {
            //Get the index and UUID of this
            var index = this.content.indexOf(c[i]);
            var uuid = c[i]._metadata.uuid;

            //Validate
            if(index == -1) {
                throw "Failed to prune object; Could not locate it in the content array.";
            }

            //Remove
            this.content.splice(index, 1);
            delete this._map[uuid];
        }
    }

    _OnRpcCmdCommitCreated(data) {
        //Set
        var c = this._AddWorkingCommit(data.commit_type, data.commit_id.id_string);
        this.Log("ContentServerBucketRPC", "New commit " + c.id + " (type " + c.type + ") created for bucket " + this.bucketName + ".");
    }

    _OnRpcCmdCommitPutContent(data) {
        //Get and validate the requested commit
        var commit = this._GetWorkingCommit(data.commit_type);
        if(commit == null) {return;}
        if(commit.id != data.commit_id.id_string) {return;}

        //Add
        this._waitingItems.push(data.entity);
        commit.updated_uuids.push(this.GetObjectUUID(data.entity));
    }

    _OnRpcCmdCommitFinalized(data) {
        //Get and validate the requested commit
        var commit = this._GetWorkingCommit(data.commit_type);
        if(commit == null) {return;}
        if(commit.id != data.commit_id.id_string) {return;}

        //Force apply changes
        var appliedCount = this.ApplyNewChanges();

        //Find items we need to prune. These will be items we have in the content but didn't get updated during the last commit
        var pruneItems = [];
        for (var i = 0; i<this.content.length; i+=1) {
            if (!commit.updated_uuids.includes(this.content[i]._metadata.uuid) && this.content[i]._metadata.commit_type == commit.type) {
                pruneItems.push(this.content[i]);
            }
        }

        //Prune
        var removedCount = pruneItems.length;
        this._RemoveContent(pruneItems);

        //Log
        this.Log("ContentServerBucketRPC", "Finalized commit " + commit.id + " (type " + commit.type + ") (bucket " + this.bucketName + "). Added " + commit.updated_uuids.length + ", removed " + removedCount + ", applied " + appliedCount + ".");
    }

}