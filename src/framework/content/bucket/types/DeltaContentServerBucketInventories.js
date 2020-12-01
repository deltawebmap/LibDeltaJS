import DeltaContentServerBucketBase from '../DeltaContentServerBucketBase.js'

export default class DeltaContentServerBucketInventories extends DeltaContentServerBucketBase {

    constructor(conn, contentServer, guildId) {
        super(conn, contentServer, guildId, "inventories");
    }

    /*
        [ABSTRACT] Returns the unique identifier (UUID) for an object

        @o: The object to query
    */
    GetObjectUUID(o) {
        return o.holder_id;
    }

}