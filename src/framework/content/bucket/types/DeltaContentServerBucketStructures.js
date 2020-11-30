import DeltaContentServerBucketBase from '../DeltaContentServerBucketBase.js'

export default class DeltaContentServerBucketStructures extends DeltaContentServerBucketBase {

    constructor(conn, contentServer, guildId) {
        super(conn, contentServer, guildId, "structures");
    }

    /*
        Downloads a chunk of content and returns it as an array.

        @page: The page offset
        @limit: The max number of entries to return. If this is more than what is returned, we assume we are at the end.
    */
    async DownloadChunk(page, limit) {
        //Build URL
        var url = this.GetChunkURL("structures_bin", page, limit);

        //Request
        var content = await this.conn.WebGetBinaryStructures(url);
        return content.content;
    }

    /*
        [ABSTRACT] Returns the number type for the commit this bucket is responsible for
    */
    GetCommitType() {
        return 1; //confirm this
    }

    /*
        [ABSTRACT] Returns the unique identifier (UUID) for an object

        @o: The object to query
    */
    GetObjectUUID(o) {
        return o.structure_id;
    }
}