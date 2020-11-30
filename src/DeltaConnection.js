import DeltaCurrentUser from './framework/DeltaCurrentUser.js';
import DeltaPrimalPackageManager from './framework/content/primaldata/DeltaPrimalPackageManager.js';
import PlatformProfileCache from './framework/content/profile/DeltaPlatformProfileCache.js';
import DeltaStructureMetadata from './framework/content/structures/DeltaStructureMetadata.js';
import DeltaContentServer from './framework/content/bucket/DeltaContentServer.js';
import DeltaWebFormatDecoder from './framework/utils/DeltaWebFormatDecoder.js';
import DeltaBinaryStructuresDecoder from './framework/utils/DeltaBinaryStructuresDecoder.js';

//This class is used by most of the other devices in this library. You should create a DeltaConnection first.

export default class DeltaConnection {

    /* 
    Enviornment is an object that defines how this should operate. Here is an example:
    {
        API_ENDPOINT: "https://deltamap.net/api",
        ECHO_API_ENDPOINT: "https://echo-content.deltamap.net",
        CONFIG_API_ENDPOINT: "https://config.deltamap.net",
        PACKAGES_API_ENDPOINT: "https://charlie-packages.deltamap.net",
        RPC_HOST: "wss://rpc-prod.deltamap.net",
        ENV: "prod",
        AUTH: {
            AUTH_CLIENT_ID: "66408GC0EFZY2Q9FMA7637WC",
            AUTH_CLIENT_SECRET: "XVAXEL509B0EH2O55FCWLWG3LEU60U2TSSNUMI05Y1"
        }
    }
    */
    constructor(enviornment) {
        this.enviornment = enviornment;
        this.user = null;
        this.primal_data = null;
        this.structure_metadata = null;
        this.platform_profile_cache = null;
        this._rpcSock = null;
        this._contentServers = {};
    }

    async Init() {
        //Create and login the current user
        this.user = new DeltaCurrentUser(this);
        await this.user.Init();

        //Get primal data manager
        this.primal_data = new DeltaPrimalPackageManager(this);

        //Prepare platform profile cache
        this.platform_profile_cache = new PlatformProfileCache(this);

        //Prepare the structure metadata
        this.structure_metadata = new DeltaStructureMetadata(this);
        await this.structure_metadata.Init();
    }

    Log(topic, msg) {
        console.log("[" + topic + "] => " + msg);
    }

    /*
        Returns a Delta Web Map access token
    */
    GetAccessToken() {
        return localStorage.getItem("access_token");
    }

    /*
        Sends the user to a login screen
    */
    SendToLogin() {
        window.location = "/auth/?client_id=" + this.enviornment.AUTH.AUTH_CLIENT_ID;
    }

    /*
        Sends the user to a login screen
    */
    GetContentServerByHostname(hostname) {
        if (!this._contentServers[hostname]) {
            this._contentServers[hostname] = new DeltaContentServer(this, hostname);
        }
        return this._contentServers[hostname];
    }

    /*
        Sends an authenticated HTTP GET request to the requested URL, then returns the response as JSON

        @url: The URL to request
    */
    async WebGetJson(url) {
        var r = await this._BaseWebRequest(url, "json", "GET", null);
        return r;
    }

    /*
        Sends an authenticated HTTP GET request to the requested URL, then decodes and returns a Delta Web Format file

        @url: The URL to request
    */
    async WebGetDWF(url) {
        var r = await this._BaseWebRequest(url, "arraybuffer", "GET", null);
        var decoder = new DeltaWebFormatDecoder(new DataView(r));
        decoder.Decode();
        return decoder;
    }

    /*
        Sends an authenticated HTTP GET request to the requested URL, then decodes and returns a binary structures file

        @url: The URL to request
    */
    async WebGetBinaryStructures(url) {
        var r = await this._BaseWebRequest(url, "arraybuffer", "GET", null);
        var decoder = new DeltaBinaryStructuresDecoder(new DataView(r));
        decoder.Decode();
        return decoder;
    }

    /*
        Sends an authenticated HTTP POST request to the requested URL, then returns the response as JSON

        @url: The URL to request
        @body: The object to POST
    */
    async WebPostJson(url, body) {
        var r = await this._BaseWebRequest(url, "json", "POST", JSON.stringify(body));
        return r;
    }

    /*
        Downloads an Image from a URL

        @url: The URL to request
    */
    async WebGetImage(url) {
        var img = new Image();
        var p = new Promise((resolve, reject) => {
            img.onload = () => {
                resolve(img);
            };
            img.onerror = () => {
                reject();
            }
        });
        img.src = url;
        return p;
    }

    /*
        Sends an HTTP request. Intended for internal use only.

        @url: The URL to request
        @type: The type of response to use
        @method: The request method
        @body: The request body, or null
    */
    async _BaseWebRequest(url, type, method, body) {
        return new Promise((resolve, reject) => {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = (evt) => {
                if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                    resolve(xmlhttp.response);
                } else if (xmlhttp.readyState === 4) {
                    if (xmlhttp.status == 401) {
                        this.SendToLogin();
                    } else {
                        reject({
                            status: xmlhttp.status
                        });
                    }
                }
            }
            xmlhttp.open(method, url, true);
            xmlhttp.responseType = type;
            xmlhttp.setRequestHeader("Authorization", "Bearer " + this.GetAccessToken());
            xmlhttp.send(body);
        });
    }


}