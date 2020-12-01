import DeltaObject from '../DeltaObject.js';

export default class DeltaGuildUpdateBuilder extends DeltaObject {

    constructor(conn, guild) {
        super(conn);
        this._guild = guild;
        this._update = {};
    }

    UpdateName(name) {
        this._guild.info.name = name;
        this._guild.name = name;
        this._update.name = name;
        return this;
    }

    UpdatePermissionFlags(flag, value) {
        var f = this._guild.info.permission_flags;
        if(value) {
            f |= 1 << flag;
        } else {
            f &= ~(1 << flag);
        }
        this._guild.info.permission_flags = f;
        this._update.permission_flags = f;
        return this;
    }

    UpdatePermissionTemplate(template) {
        this._guild.info.permissions_template = template;
        this._update.permissions_template = template;
        return this;
    }

    UpdateIsSecure(secure) {
        this._guild.info.is_secure = secure;
        this._update.is_secure = secure;
        return this;
    }

    UpdateIsLocked(locked) {
        this._guild.info.is_locked = locked;
        this._update.is_locked = locked;
        return this;
    }

    async Apply() {
        //Get URL
        var url = this.conn.enviornment.API_ENDPOINT + "/servers/" + this._guild.id + "/admin/update";

        //Send
        await this.conn.WebPostJson(url, this._update);
    }

}