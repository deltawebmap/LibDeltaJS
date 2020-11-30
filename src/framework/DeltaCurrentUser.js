import DeltaObject from './DeltaObject.js';
import DeltaGuild from './guilds/DeltaGuild.js';

//This represents a current user. Realistically, there will only be one instance of this.

export default class DeltaCurrentUser extends DeltaObject {

    constructor(conn) {
        super(conn);
        this.name = null;
        this.profile_image = null;
        this.id = null;
        this.steam_id = null;
        this.user_settings = null;
        this.guilds = null;
    }

    async Init() {
        //Download the user data from /users/@me
        this.Log("UserInit", "Downloading current user data...");
        var me = await this.conn.WebGetJson(this.conn.enviornment.API_ENDPOINT + "/users/@me");

        //Unpack
        this.name = me.screen_name;
        this.profile_image = me.profile_image_url;
        this.id = me.id;
        this.steam_id = me.steam_id;
        this.user_settings = me.user_settings;

        //Load guilds
        this.guilds = {};
        for(var i = 0; i<me.servers.length; i+=1) {
            var s = new DeltaGuild(this.conn, me.servers[i]);
            this.guilds[s.id] = s;
        }

        //Log
        this.Log("UserInit", "Logged in user " + this.id + " \"" + this.name + "\" with " + me.servers.length + " guilds successfully.");
    }

}