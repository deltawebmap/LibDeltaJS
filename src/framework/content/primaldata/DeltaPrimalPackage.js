import DeltaStreamingContentBase from '../DeltaStreamingContentBase.js';

//This is an actual primal package downloaded from the server

export default class DeltaPrimalPackage extends DeltaStreamingContentBase {

    /*
        @conn: A DeltaConnection
        @manager: A DeltaPrimalPackageManager
        @info: Package info from the query endpoint on the Charlie server
    */
    constructor(conn, manager, info) {
        super(conn);
        this.manager = manager;
        this.id = info.package_name;
        this.type = info.package_type;
        this.mod_id = info.mod_id;
        this.last_updated = info.last_updated;
        this.urls = {
            "dwf": info.package_url_dwf,
            "json": info.package_url_json
        };
        this.entity_count = info.entity_count;
        this.display_name = info.display_name;
        this.content = {}; //Content by classname
    }

    /*
        Loads all content, either from the local database or the internet, and fires progress events.

        @progress (optional): A callback function that will be fired each time a chunk is downloaded, following the following form:
            ([int] latestChunkItemCount)
        @newEpoch: The current epoch, saved to the database.
    */
    async PreparePrimalPackage(progress, newEpoch) {
        //Fetch content we have stored locally
        if (this.manager.db != null) {
            //Fetch. This also contains data for other types
            var datas = await this.manager._GetContentFromDatabase(this.mod_id);

            //Loop all
            for (var i = 0; i < datas.length; i += 1) {
                //Get
                var content = datas[i];

                //Check type and add
                if (content.PackageType == this.type) {
                    this.content[content.ContentClassname] = content.ContentPayload;
                }
            }
        }

        //Download updates if needed
        if (this.entity_count > 0) {
            //Download
            var items = await this.DownloadContent(progress);

            //Add
            for (var i = 0; i < items.length; i += 1) {
                this.content[items[i].classname] = items[i];
            }

            //Write to database
            if (this.manager.db != null) {
                await this.manager._WriteContentChunkToDatabase(this.mod_id, this.type, items);
            }
        }

        //Set epoch
        if (this.manager.db != null) {
            await this.manager.SetLastEpoch(this.mod_id, this.type, newEpoch);
        }
    }

    /*
        Downloads a chunk of content and returns it as an array.

        @page: The page offset
        @limit: The max number of entries to return. If this is more than what is returned, we assume we are at the end.
    */
    async DownloadChunk(page, limit) {
        //Get the last modified epoch
        var requestEpoch = await this.manager.GetLastEpoch(this.mod_id, this.type);
        
        //Build URL
        var url = this.urls.dwf + "?last_epoch=" + requestEpoch + "&skip=" + (page * limit) + "&limit=" + limit;

        //Fetch
        var content = await this.conn.WebGetDWF(url);
        return content.content;
    }

    GetItemByClassName(classname) {
        var c = this.content[classname];
        if (c != null) {
            c._package = this;
        }
        return c;
    }

    GetByFilter(x) {
        //Searches via filter instead of index. This method is slow
        var k = Object.keys(this.content);
        for (var i = 0; i < k.length; i += 1) {
            if (x(this.content[k[i]])) {
                return this.content[k[i]];
            }
        }
        return null;
    }

}