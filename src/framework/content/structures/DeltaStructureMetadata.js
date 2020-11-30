import DeltaObject from '../../DeltaObject.js';

export default class DeltaStructureMetadata extends DeltaObject {

    constructor(conn) {
        super(conn);
    }

    async Init() {
        //Request the metadata
        this.Log("StructureMetadataInit", "Requesting structure metadata...");
        var metadata = await this.conn.WebGetJson(this.conn.enviornment.ECHO_API_ENDPOINT + "/structure_metadata.json");
        this.Log("StructureMetadataInit", "Got " + metadata.metadata.length + " structures.");

        //Request the image
        this.Log("StructureMetadataInit", "Downloading structure tilemap from " + metadata.image_url + "...");
        this._tilemap = await this.conn.WebGetImage(metadata.image_url);
        this.Log("StructureMetadataInit", "Successfully downloaded tilemap image.");
    }

}