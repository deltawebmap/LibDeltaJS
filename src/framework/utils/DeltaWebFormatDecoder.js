import DeltaBinaryDecoderBase from './DeltaBinaryDecoderBase.js';

export default class DeltaWebFormatDecoder extends DeltaBinaryDecoderBase{

    /*
        @reader: A DataView
    */
    constructor(reader) {
        super(reader); //this brought back memories of a cartoon I saw when I was probably too old to be watching it

        this.customData = {};
        this.nameTable = [];
        this.structDefinition = [];
        this.content = [];
    }

    Decode() {
        //Read file header
        var sign = this._ReadInt32();
        var nameTableLen = this._ReadInt32();
        var fileVersion = this._ReadInt32();
        var elementCount = this._ReadInt32();

        //Validate
        if (sign != 1481463620) {
            throw "This is not a valid Delta Web Format file.";
        }
        if (fileVersion != 1) {
            throw "File version not supported. Outdated client?";
        }

        //Read custom data
        this._ReadCustomData();

        //Read name table
        this._ReadNameTable(nameTableLen);

        //Read struct definition
        this.structDefinition = this._DecodeStructDefinition();

        //Decode content
        for (var i = 0; i < elementCount; i += 1) {
            this.content.push(this._DecodeObject(this.structDefinition));
        }

        //Read end of file sign
        if (this._ReadInt32() != 1886680168) {
            throw "File not read correctly";
        }
        if (this._ReadInt32() != 791624307) {
            throw "File not read correctly";
        }
        if (this._ReadInt32() != 1953260900) {
            throw "File not read correctly";
        }
        if (this._ReadInt32() != 1885433185) {
            throw "File not read correctly";
        }
        if (this._ReadInt32() != 1952804398) {
            throw "File not read correctly";
        }

        return this.content;
    }

    _ReadCustomData() {
        var count = this._ReadByte();
        for (var i = 0; i < count; i++) {
            var id = this._ReadByte();
            var len = this._ReadByte();
            if (len == 4) {
                //Read
                this.customData[id] = this._ReadInt32();
            } else {
                //Not supported. Skip
                this.index += len;
            }
        }
    }

    _ReadNameTable(count) {
        for (var i = 0; i < count; i += 1) {
            this.nameTable.push(this._ReadLongString());
        }
    }

    _DecodeStructDefinition() {
        //Read length
        var count = this._ReadByte();

        //Read each prop
        var props = [];
        for (var i = 0; i < count; i += 1) {
            //Read type
            var type = this._ReadByte();

            //Read name
            var name = this._ReadShortString();

            //Build
            var p = {
                "type": type,
                "name": name
            };

            //Read extras
            if (type == 1 || type == 4) {
                p.struct = this._DecodeStructDefinition();
            }

            //Add
            props.push(p);
        }

        return props;
    }

    _DecodeObject(structDefinition) {
        //Create object to hold output
        var output = {};

        //Loop through each item in the struct definition
        for (var i = 0; i < structDefinition.length; i += 1) {
            var s = structDefinition[i];

            //Read flags
            var flags = this._ReadByte();

            //Check if this is null
            if (this._ReadFlag(flags, 7)) {
                //Add this to the output, but just set it's value to null
                output[s.name] = null;
                continue;
            }

            //Read based upon the type
            var value = null;
            if (s.type == 0) {
                //Read from name table
                value = this.nameTable[this._ReadUInt16()];
            } else if (s.type == 1) {
                //Object
                value = this._DecodeObject(s.struct);
            } else if (s.type == 2) {
                //Bool - read from flags
                value = this._ReadFlag(flags, 0);
            } else if (s.type == 3) {
                //Read string with length decided by flags
                value = this._DecodeVariableFlagStringLength(flags);
            } else if (s.type == 4) {
                //Array of objects
                value = this._DecodeArray(flags, () => {
                    return this._DecodeObject(s.struct);
                });
            } else if (s.type == 5) {
                //Array of bools
                value = this._DecodeArray(flags, () => {
                    return this._ReadByte() == 1;
                });
            } else if (s.type == 6) {
                //Array of ints
                value = this._DecodeArray(flags, () => {
                    return this._ReadInt32();
                });
            } else if (s.type == 7) {
                //Array of floats
                value = this._DecodeArray(flags, () => {
                    return this._ReadSingleFloat();
                });
            } else if (s.type == 8) {
                //Int
                value = this._ReadInt32();
            } else if (s.type == 9) {
                //Float
                value = this._ReadSingleFloat();
            } else if (s.type == 10) {
                //Date time
                var epoch = this._ReadInt32();
                //TODO
                value = epoch;
            } else if (s.type == 11) {
                //Array of strings
                //Determine if any string is so long that it requires two bytes to access
                var longString = this._ReadFlag(flags, 4);

                //Decode array
                value = this._DecodeArray(flags, () => {
                    if (longString) {
                        return this._ReadLongString();
                    } else {
                        return this._ReadShortString();
                    }
                });
            } else if (s.type == 12) {
                //Double, but interpeted as a float
                value = this._ReadSingleFloat();
            } else if (s.type == 13) {
                //Ushort
                value = this._ReadUInt16();
            } else {
                throw "Type not found";
            }

            //Write
            output[s.name] = value;
        }

        return output;
    }

    _DecodeArray(flags, decodeCallback) {
        //Create output
        var output = [];

        //Read length
        var count = this._DecodeVariableFlagLength(flags);

        //Check if all items are null
        if (this._ReadFlag(flags, 2)) {
            //All items are null, but there are still items. Add them
            for (var i = 0; i < count; i += 1) {
                output.push(null);
            }
            return output;
        }

        //Check if any are null, as we'll have an extra byte before if they are
        var hasNull = this._ReadFlag(flags, 1);

        //Read items
        for (var i = 0; i < count; i += 1) {
            //Check if it's null if we must
            if (hasNull) {
                var f = this._ReadByte();
                if (this._ReadFlag(f, 0)) {
                    //This is null
                    output.push(null);
                    continue;
                }
            }

            //Decode
            output.push(decodeCallback());
        }

        return output;
    }

    _DecodeVariableFlagLength(flags) {
        //Decodes a length that uses a flag to decide if it is 1 or 2 bytes long
        var strLen = 0;
        if (this._ReadFlag(flags, 0)) {
            //2 byte string
            strLen = this._ReadUInt16();
        } else {
            //1 byte string
            strLen = this._ReadByte();
        }
        return strLen;
    }

    _DecodeVariableFlagStringLength(flags) {
        //Decodes a string that uses a flag to decide if the length is 1 or 2 bytes
        var strLen = this._DecodeVariableFlagLength(flags);
        return this._ReadFixedString(strLen);
    }

}