import DeltaObject from '../DeltaObject.js';
import DeltaContentServerBucketDinos from '../content/bucket/types/DeltaContentServerBucketDinos.js';
import DeltaContentServerBucketInventories from '../content/bucket/types/DeltaContentServerBucketInventories.js';
import DeltaContentServerBucketStructures from '../content/bucket/types/DeltaContentServerBucketStructures.js';
import DeltaGuildUpdateBuilder from './DeltaGuildUpdateBuilder.js';
import DeltaEventDispatcher from '../DeltaEventDispatcher.js';

export default class DeltaGuild extends DeltaObject {

    /*
        @conn: A DeltaConnection
        @info: A NetGuild object from the backend, usually from the /users/@me/ endpoint
    */
    constructor(conn, info) {
        super(conn);
        this.name = info.name;
        this.icon_url = info.icon_url;
        this.map_id = info.map_id;
        this.id = info.id;
        this.info = info;
        this.primaldata = null;

        //Events
        this.OnServerUpdated = new DeltaEventDispatcher();

        //Prepare content
        this.content_server = this.conn.GetContentServerByHostname(info.content_server_hostname);
        this.dinos = new DeltaContentServerBucketDinos(this.conn, this.content_server, this.id);
        this.inventories = new DeltaContentServerBucketInventories(this.conn, this.content_server, this.id);
        this.structures = new DeltaContentServerBucketStructures(this.conn, this.content_server, this.id);
        this.buckets = [this.dinos, this.inventories, this.structures];

        //Subscribe RPC events
        this.SubscribeRPCEvent("SERVER_UPDATED", (p) => {
            //Server info was updated
            this.info = p.guild;
            this.name = p.guild.name;
            this.icon_url = p.guild.icon_url;
            this.map_id = p.guild.map_id;
            this.OnServerUpdated.Fire(this);
            this.Log("GuildRPC", "Server \"" + this.name + "\" (" + this.id + ") was updated via RPC.");
        });
    }

    /*
        Subscribes to an RPC opcode, filtered to this server.

        @opcode: The opcode to subscribe to
        @callback: The callback that'll be fired, in this form:
            ([object] payload, [string] opcode)
    */
    SubscribeRPCEvent(opcode, callback) {
        this.conn.SubscribeRPCEvent(opcode, this.id, callback);
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
    
    /* 
        Gets an item entry from the primal data, assuming it is ready. If it can't be found, a placeholder is returned instead.

        @classname: The item classname.
    */
    GetItemEntryByClassName(classname) {
        //Attempt to get it
        var s = this.primaldata.GetContentByClassName(classname, "ITEMS");
        if(s != null) {
            return s;
        }

        //Return a default
        return {
            "classname": classname,
            "icon": {
                "image_url": "https://icon-assets.deltamap.net/unknown_dino.png",
                "image_thumb_url": "https://icon-assets.deltamap.net/unknown_dino.png"
            },
            "hideFromInventoryDisplay": false,
            "useItemDurability": false,
            "isTekItem": false,
            "allowUseWhileRiding": false,
            "name": classname,
            "description": "Unknown item. It may be modded and is unsupported at this time.",
            "spoilingTime": 0.0,
            "baseItemWeight": 0.0,
            "useCooldownTime": 0.0,
            "baseCraftingXP": 1.0,
            "baseRepairingXP": 0.0,
            "maxItemQuantity": 0,
            "addStatusValues": {

            }
        };
    }

    /* 
        Gets an item entry from the primal data using a structure entry. RETURNS NULL if not found.

        @classname: The structure classname.
    */
    GetItemEntryByStructureClassName(classname) {
        //Search for the item
        return this.primaldata.GetContentByFilter("ITEMS", (x) => {
            return x.structure_classname == classname;
        });
    }

    /* 
        Returns a builder you can use to update the basic attributes of the server
    */
    GetUpdateBuilder() {
        return new DeltaGuildUpdateBuilder(this.conn, this);
    }

}