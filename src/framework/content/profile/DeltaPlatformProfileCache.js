import DeltaObject from '../../DeltaObject.js';

//Use this class to bulk request platform (Steam) IDs from the server, using a token provided by the backend server

export default class PlatformProfileCache extends DeltaObject {

    constructor(conn) {
        super(conn);
        this.cache = {}; //Key is the token
    }

    //Requests many tokens at once, but won't return anything
    BulkRequestTokens(tokens) {
        //Find which tokens are new and need to be requested
        var newTokens = [];
        for (var i = 0; i < tokens.length; i += 1) {
            if (this.cache[tokens[i]] == null) {
                newTokens.push(tokens[i]);
            }
        }

        //If we have new ones, start the process
        if (newTokens.length > 0) {
            //Create entry for each
            for (var i = 0; i < newTokens.length; i += 1) {
                this.cache[newTokens[i]] = {
                    "status": -1,
                    "waiting_promises": []
                }
            }

            //Run
            this._LookupTokens(newTokens);
        }
    }

    //Reads an array of objects and gets the token from a key in each of them. Then, looks those tokens up
    BulkRequestTokensFromObjectArray(objArray, keyName) {
        //Gather tokens
        var tokens = [];
        for (var i = 0; i < objArray.length; i += 1) {
            tokens.push(objArray[i][keyName]);
        }

        //Fetch
        return this.BulkRequestTokens(tokens);
    }

    //Requests a single token and returns it when we get it
    async GetProfileAsync(token) {
        //Check if we've already started the process
        if (this.cache[token] == null) {
            //We haven't requested this yet. We'll begin the process, but this isn't ideal
            this.Log("PlatformProfileCache", "Requested new token with GetProfileAsync. For bulk lookups, use BulkRequestTokens instead.");
            this.BulkRequestTokens([token]);
        }

        //We've started. Check if we've finished or not
        if (this.cache[token].status == 0) {
            //Finished! We can just return this immediately.
            return new Promise((resolve, reject) => {
                resolve(this.cache[token].profile);
            });
        } else {
            //The process is still ongoing. Add a waiting promise
            return new Promise((resolve, reject) => {
                this.cache[token].waiting_promises.push(resolve);
            });
        }
    }

    /* Private API */

    async _LookupTokens(tokens) {
        //Send request
        var response = await this.conn.WebPostJson(this.conn.enviornment.API_ENDPOINT + "/fetch_platform_profiles", {
            "tokens": tokens
        });

        //Loop through and set, then send events
        for (var i = 0; i < response.profiles.length; i += 1) {
            var p = response.profiles[i];

            //Update
            this.cache[p.token].profile = p.profile;
            this.cache[p.token].status = 0;

            //Fire events
            for (var j = 0; j < this.cache[p.token].waiting_promises.length; j += 1) {
                this.cache[p.token].waiting_promises[j](p.profile);
            }

            //Clean up
            delete this.cache[p.token].waiting_promises;
        }
    }

}