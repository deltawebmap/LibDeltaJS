import DeltaBinaryDecoderBase from './DeltaBinaryDecoderBase.js';

//Reads according to https://docs.google.com/spreadsheets/d/1bmgWIyZcW-E-H-tjIrJyQtXbZHik1XJbMY02I22i0KQ/edit?usp=sharing

export default class DeltaBinaryStructuresDecoder extends DeltaBinaryDecoderBase {

    /*
        @reader: A DataView
    */
    constructor(reader) {
        super(reader);

        this.nameTable = [];
        this.commitTable = [];
        this.content = [];
    }

    Decode() {
        //Read file header
        var sign = this._ReadInt32();
        var fileVersion = this._ReadUInt16();
        var nameTableLen = this._ReadUInt16();

        //Validate
        if (sign != 1397577540) {
            throw "This is not a valid Delta Web Format file.";
        }
        if (fileVersion != 2) {
            throw "File version not supported. Outdated client?";
        }

        //Read name table
        for(var i = 0; i<nameTableLen; i+=1) {
            this.nameTable.push(this._ReadNullTerminatedString());
        }

        //Read commit ID table count
        var commitCount = this._ReadUInt16();

        //Read commit table
        for(var i = 0; i<commitCount; i+=1) {
            this.commitTable.push(this._ReadNullTerminatedString());
        }

        //Read content count
        var contentTableLen = this._ReadUInt16();

        //Decode content
        for (var i = 0; i < contentTableLen; i += 1) {
            this.content.push(this._DecodeObject(this.structDefinition));
        }

        return this.content;
    }

    _DecodeObject() {
        //Read
        var nameTableIndex = this._ReadUInt16();
        var flags = this._ReadByte();
        var rotationScaled = this._ReadByte() * 1.41176471;
        var commitIdIndex = this._ReadByte();
        var commitType = this._ReadByte();
        var arkId = this._ReadInt32();
        var tribeId = this._ReadInt32();
        var x = this._ReadSingleFloat();
        var y = this._ReadSingleFloat();
        var z = this._ReadSingleFloat();

        //Convert
        return {
            "classname": this.nameTable[nameTableIndex],
            "location": {
                "x": x,
                "y": y,
                "z": z,
                "yaw": rotationScaled,
                "pitch": 0,
                "roll": 0
            },
            "structure_id": arkId,
            "has_inventory": ((flags >> 0) & 1) == 1,
            "tribe_id": tribeId,
            "commit_id": this.commitTable[commitIdIndex],
            "commit_type": commitType
        };
    }

}