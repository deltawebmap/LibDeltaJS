import DeltaObject from '../DeltaObject.js';
import DeltaContentServerBucketDinos from '../content/bucket/types/DeltaContentServerBucketDinos.js';
import DeltaContentServerBucketInventories from '../content/bucket/types/DeltaContentServerBucketInventories.js';
import DeltaContentServerBucketStructures from '../content/bucket/types/DeltaContentServerBucketStructures.js';

export default class DeltaGuild extends DeltaObject {

    /*
        @conn: A DeltaConnection
        @info: A NetGuild object from the backend, usually from the /users/@me/ endpoint
    */
    constructor(conn, info) {
        super(conn);
        this.name = info.display_name;
        this.icon_url = info.image_url;
        this.map_id = info.map_id;
        this.id = info.id;
        this.info = info;
        this.primaldata = null;

        //Prepare content
        this.content_server = this.conn.GetContentServerByHostname(info.content_server_hostname);
        this.dinos = new DeltaContentServerBucketDinos(this.conn, this.content_server, this.id);
        this.inventories = new DeltaContentServerBucketInventories(this.conn, this.content_server, this.id);
        this.structures = new DeltaContentServerBucketStructures(this.conn, this.content_server, this.id);
        this.buckets = [this.dinos, this.inventories, this.structures];
    }

    /*
        Begins the download of primal data, firing progress events as we go.

        @progress: A callback to be periodically fired as content is downloaded in the following form:
            ([int] Total progress, [int] Target progress, [DeltaPrimalPackage] Current package)
    */
    async PreparePrimalContent(progress) {
        //Get interface
        var mods = this.info.mods.concat(["0"]);
        this.Log("GuildPreparePrimalContent", "Querying interface for " + mods.length + " mods...");
        this.primaldata = await conn.primal_data.RequestInterface(mods);

        //Get new content count
        var total = this.primaldata.GetTotalEntityCount();

        //Fire placeholder event
        var downloaded = 0;
        var currentPackage = this.primaldata.packages[0];
        progress(downloaded, total, currentPackage);

        //Begin downloading
        var downloaded = 0;
        this.Log("GuildPreparePrimalContent", "Beginning download of primal content...");
        await this.primaldata.DownloadContent((p, n) => {
            downloaded += p;
            if(total != 0) {
                this.Log("GuildPreparePrimalContent", "Downloaded " + downloaded + " of " + total + " entities... (" + Math.round((downloaded / total) * 100) + "% completed)");
            }
            if(n != null) {
                this.Log("GuildPreparePrimalContent", "Started download of package \"" + n.display_name + "\":" + n.type + "...");
                currentPackage = n;
            }
            progress(downloaded, total, currentPackage);
        });
        this.Log("GuildPreparePrimalContent", "Primal content has finished downloading.");
    }

    /*
        Begins the download of server content.

        @progress: A callback to be periodically fired as content is downloaded in the following form:
            ([int] Total progress, [int] Target progress, [DeltaContentServerBucketBase] Current bucket)
    */
    async PrepareContentBuckets(progress) {
        //Get total content count
        var total = await this.content_server.GetServerTotalContentCount(this.id);

        //Get params
        var downloaded = 0;
        var currentPackage = this.buckets[0];

        //Begin downloading
        var downloaded = 0;
        this.Log("GuildPrepareContentBuckets", "Beginning download of " + this.buckets.length + " server content buckets (" + total + " items) from " + this.content_server.hostname + "...");
        for (var i = 0; i<this.buckets.length; i+=1) {
            this.Log("GuildPrepareContentBuckets", "Started download of bucket " + this.buckets[i].bucketName + "...");
            currentPackage = this.buckets[i];
            progress(downloaded, total, currentPackage);
            await this.buckets[i].PrepareBucket((p) => {
                downloaded += p;
                if(total != 0) {
                    this.Log("GuildPrepareContentBuckets", "Downloaded " + downloaded + " of " + total + " entities... (" + Math.round((downloaded / total) * 100) + "% completed)");
                }
                progress(downloaded, total, currentPackage);
            });
        }
        this.Log("GuildPrepareContentBuckets", "Server content buckets have finished downloading.");

        //Register the buckets with this guild
        this.content_server.RegisterServer(this.id);
    }

    /* 
        Gets a species from the primal data, assuming it is ready. If it can't be found, a placeholder is returned instead.

        @classname: The dinosaur classname.
    */
    GetSpeciesByClassName(classname) {
        //Attempt to get it
        var s = this.primaldata.GetContentByClassName(classname, "SPECIES");
        if(s != null) {
            return s;
        }

        //Return a default
        return {
            "screen_name": classname,
            "colorizationIntensity": 1,
            "babyGestationSpeed": -1,
            "extraBabyGestationSpeedMultiplier": -1,
            "babyAgeSpeed": 0.000003,
            "extraBabyAgeSpeedMultiplier": 0,
            "useBabyGestation": false,
            "extraBabyAgeMultiplier": 1.7,
            "statusComponent": {
                "baseFoodConsumptionRate": -0.001852,
                "babyDinoConsumingFoodRateMultiplier": 25.5,
                "extraBabyDinoConsumingFoodRateMultiplier": 20,
                "foodConsumptionMultiplier": 1,
                "tamedBaseHealthMultiplier": 1
            },
            "adultFoods": [],
            "childFoods": [],
            "classname": classname,
            "icon": {
                "image_url": "https://icon-assets.deltamap.net/unknown_dino.png",
                "image_thumb_url": "https://icon-assets.deltamap.net/unknown_dino.png"
            },
            "baseLevel": [100, 100, 100, 100, 100, 100, 0, 0, 1, 1, 0, 1],
            "increasePerWildLevel": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "increasePerTamedLevel": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "additiveTamingBonus": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "multiplicativeTamingBonus": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "statImprintMult": null
        }
    }

}