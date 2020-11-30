import DeltaObject from '../../DeltaObject.js';
import DeltaPrimalPackageInterface from './DeltaPrimalPackageInterface.js';
import DeltaPrimalPackage from './DeltaPrimalPackage.js';

/*
    Manages content globally and exists for the entire app.
*/

export default class DeltaPrimalPackageManager extends DeltaObject {

    constructor(conn) {
        super(conn);
        this.packages = {};
        this.db = null;
        this.DATABASE_NAME = "DeltaWebMap.DeltaPrimalPackageManager.Packages";
    }

    //Requests an UNDOWNLOADED interface for a server
    //modList is a list of strings that are mod IDs. Make sure it contains "0" to load main data
    async RequestInterface(modList) {
        //Create database
        this.db = await this._InitDatabase();

        //Create the request data for the query
        var queryRequestData = {
            "requested_packages": []
        };
        for (var i = 0; i < modList.length; i += 1) {
            queryRequestData.requested_packages.push({
                "mod_id": modList[i],
                "package_type": "SPECIES",
                "last_epoch": await this.GetLastEpoch(modList[i], "SPECIES")
            });
            queryRequestData.requested_packages.push({
                "mod_id": modList[i],
                "package_type": "ITEMS",
                "last_epoch": await this.GetLastEpoch(modList[i], "ITEMS")
            });
        }

        //Send off request
        var response = await this.conn.WebPostJson(this.conn.enviornment.PACKAGES_API_ENDPOINT + "/query", queryRequestData);

        //Get the requested packages. They'll be in the same order as requested
        var interfacePackages = [];
        for (var i = 0; i < response.packages.length; i += 1) {
            interfacePackages.push(this._GetOrCreatePackage(response.packages[i]));
        }

        //Create and respond with interface
        return new DeltaPrimalPackageInterface(this.conn, this, interfacePackages, response.current_epoch);
    }

    async GetLastEpoch(modId, packageType) {
        return new Promise((resolve, reject) => {
            //Get transaction and store
            var transaction = this.db.transaction(["package_metadata"]);
            var store = transaction.objectStore("package_metadata");

            //Get all matching this mod ID
            store.get(packageType + "?" + modId).onsuccess = (e) => {
                var p = e.target.result;
                if (p == null) {
                    resolve(0);
                } else {
                    resolve(p.LastEpoch)
                }
            };
        });
    }

    async SetLastEpoch(modId, packageType, epoch) {
        return new Promise((resolve, reject) => {
            //Get transaction and store
            var transaction = this.db.transaction(["package_metadata"], "readwrite");
            var store = transaction.objectStore("package_metadata");

            //Add events
            transaction.oncomplete = function (event) {
                resolve();
            };
            transaction.onerror = function (event) {
                reject("Unexpected error writing to database: " + event.target.error);
            };

            //Create payload
            var p = {
                "PackageId": packageType + "?" + modId,
                "LastEpoch": epoch
            };

            //Add
            store.put(p);
        });
    }

    async _InitDatabase() {
        //Inits the database and returns the database
        return new Promise((resolve, reject) => {
            if (window.indexedDB) {
                //Set up DB
                var request = indexedDB.open(this.DATABASE_NAME, 1);
                request.onerror = function (event) {
                    //Failed to use indexed DB. We'll fallback on just storing the content in RAM
                    reject("There was an unexpected error opening the database.");
                };
                request.onupgradeneeded = function (event) {
                    var db = event.target.result;

                    //Create an object store for content
                    //This uses a custom key DeltaUniqueId that is unique to all mods and types, even if they overwrite the classname
                    var objectStore = db.createObjectStore("primal_content", { keyPath: "DeltaUniqueId" });

                    //Create indexes
                    objectStore.createIndex("ModId", "ModId", { unique: false });
                    objectStore.createIndex("PackageType", "PackageType", { unique: false });
                    objectStore.createIndex("ContentClassname", "ContentClassname", { unique: false });

                    //Create an object store for epochs
                    //This uses a custom key PackageId in format "{PACKAGE_TYPE}?{MOD_ID}"
                    objectStore = db.createObjectStore("package_metadata", { keyPath: "PackageId" });
                };
                request.onsuccess = (e) => {
                    resolve(e.target.result);
                };
            } else {
                //We don't have access to this
                reject("This browser does not support IndexedDB.");
            }
        });
    }

    async _WriteContentChunkToDatabase(modId, packageType, content) {
        return new Promise((resolve, reject) => {
            //Get transaction and store
            var transaction = this.db.transaction(["primal_content"], "readwrite");
            var store = transaction.objectStore("primal_content");

            //Add events
            transaction.oncomplete = function (event) {
                resolve();
            };
            transaction.onerror = function (event) {
                reject("Unexpected error writing to database: " + event.target.error);
            };

            //Loop through objects
            for (var i = 0; i < content.length; i += 1) {
                //Create payload
                var p = {
                    "DeltaUniqueId": packageType + "?" + modId + "?" + content[i].classname,
                    "ModId": modId,
                    "PackageType": packageType,
                    "ContentClassname": content[i].classname,
                    "ContentPayload": content[i]
                };

                //Add
                store.put(p);
            }
        });
    }

    async _GetContentFromDatabase(modId) {
        return new Promise((resolve, reject) => {
            //Get transaction and store
            var transaction = this.db.transaction(["primal_content"]);
            var store = transaction.objectStore("primal_content");

            //Get all matching this mod ID
            store.index("ModId").getAll(modId).onsuccess = (e) => {
                resolve(e.target.result);
            };
        });
    }

    //Returns a key for this.packages
    _GetPackageKey(packageInfo) {
        return packageInfo.package_name;
    }

    //Gets a package or creates it
    _GetOrCreatePackage(packageInfo) {
        //Try to find it
        var key = this._GetPackageKey(packageInfo);
        var p = this.packages[key];
        if (p != null) { return p; }

        //Create new package
        p = new DeltaPrimalPackage(this.conn, this, packageInfo);
        this.packages[key] = p;
        return p;
    }

}