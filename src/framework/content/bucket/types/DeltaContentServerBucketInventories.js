import DeltaContentServerBucketBase from '../DeltaContentServerBucketBase.js'

export default class DeltaContentServerBucketInventories extends DeltaContentServerBucketBase {

    constructor(conn, contentServer, guildId) {
        super(conn, contentServer, guildId, "inventories");
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
        return o.holder_id;
    }

}