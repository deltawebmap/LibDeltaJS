import DeltaObject from '../DeltaObject.js';

export default class DeltaStreamingContentBase extends DeltaObject {

    constructor(conn) {
        super(conn);
        this.CHUNK_SIZE = 300;
    }

    /*
        Downloads all chunked content and returns it in an array.

        @progress (optional): A callback function that will be fired each time a chunk is downloaded, following the following form:
            ([int] latestChunkItemCount)
    */
    async DownloadContent(progress) {
        var read = 0;
        var page = 0;
        var data = [];
        do {
            //Read
            var o = await this.DownloadChunk(page, this.CHUNK_SIZE);

            //Update state
            page++;
            read = o.length;
            data = data.concat(data, o);

            //Send event
            if(progress != null) {
                progress(o.length);
            }
        } while (read == this.CHUNK_SIZE);
        return data;
    }

    /*
        [ABSTRACT] Downloads a chunk of content and returns it as an array.

        @page: The page offset
        @limit: The max number of entries to return. If this is more than what is returned, we assume we are at the end.
    */
   async DownloadChunk(page, limit) {
       throw "This must be overriden.";
   }

}