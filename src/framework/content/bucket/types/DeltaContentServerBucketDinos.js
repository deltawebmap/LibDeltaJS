import DeltaContentServerBucketBase from '../DeltaContentServerBucketBase.js'

export default class DeltaContentServerBucketDinos extends DeltaContentServerBucketBase {

    constructor(conn, contentServer, guildId) {
        super(conn, contentServer, guildId, "dinos");
    }

    /*
        [ABSTRACT] Returns the unique identifier (UUID) for an object

        @o: The object to query
    */
    GetObjectUUID(o) {
        return o.dino_id;
    }

}