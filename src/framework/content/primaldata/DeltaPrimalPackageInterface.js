import DeltaObject from '../../DeltaObject.js';

/*
    Guilds use this to communicate with the package manager
*/

export default class DeltaPrimalPackageInterface extends DeltaObject {

    constructor(conn, manager, packages, current_epoch) {
        super(conn);
        this.manager = manager;
        this.packages = packages;
        this.current_epoch = current_epoch;
    }

    /* 
        Returns the total number of NEW content to download
    */
    GetTotalEntityCount() {
        var total = 0;
        for (var i = 0; i < this.packages.length; i += 1) {
            total += this.packages[i].entity_count;
        }
        return total;
    }

    /*
        Downloads all content.

        @progress (optional): A callback function that will be fired each time a chunk is downloaded, following the following form:
            ([int] latestChunkItemCount, [DeltaPrimalPackage, NOT GUARENTEED] currentPackage)
    */
    async DownloadContent(progress) {
        //Loop through all packages and download them all
        for (var i = 0; i < this.packages.length; i += 1) {
            if(progress != null) {
                progress(0, this.packages[i]);
            }
            await this.packages[i].PreparePrimalPackage(progress, this.current_epoch);
        }
    }

    GetContentByClassName(classname, packageType) {
        //Start looking for this, starting from the mod on top
        for (var i = 0; i < this.packages.length; i += 1) {
            //Check if the package type matches
            if (this.packages[i].type != packageType) {
                continue;
            }

            //Check if this contains this
            if (this.packages[i].GetItemByClassName(classname) != null) {
                return this.packages[i].GetItemByClassName(classname);
            }
        }

        //Not found
        return null;
    }

    GetContentByFilter(packageType, x) {
        //Start looking for this, starting from the mod on top
        for (var i = 0; i < this.packages.length; i += 1) {
            //Check if the package type matches
            if (this.packages[i].type != packageType) {
                continue;
            }

            //Search by filter
            var result = this.packages[i].GetByFilter(x);
            if (result != null) {
                return result;
            }
        }

        //Not found
        return null;
    }

    GetAllContentOfType(packageType) {
        //Seek content, starting from the bottom mod
        var content = {};
        for (var i = this.packages.length-1; i >= 0; i -= 1) {
            //Check if the package type matches
            if (this.packages[i].type != packageType) {
                continue;
            }

            //Add each
            var ok = Object.keys(this.packages[i].content);
            for (var j = 0; j < ok.length; j += 1) {
                content[this.packages[i].content[ok[j]].classname] = this.packages[i].content[ok[j]];
            }
        }

        //Flatten
        var flattened = [];
        var k = Object.keys(content);
        for (var i = 0; i < k.length; i += 1) {
            flattened.push(content[k[i]]);
        }
        return flattened;
    }

}