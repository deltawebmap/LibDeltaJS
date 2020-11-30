export default class DeltaBinaryDecoderBase {

    /*
        @reader: A DataView
    */
    constructor(reader) {
        this.reader = reader;
        this.index = 0;
    }

    _ReadFlag(flags, index) {
        return ((flags >> index) & 1) == 1;
    }

    _ReadByte() {
        var v = this.reader.getUint8(this.index);
        this.index += 1;
        return v;
    }

    _ReadShortString() {
        return this._ReadFixedString(this._ReadByte());
    }

    _ReadLongString() {
        return this._ReadFixedString(this._ReadInt16());
    }

    _ReadFixedString(len) {
        var s = "";
        for (var i = 0; i < len; i += 1) {
            s += String.fromCharCode(this.reader.getUint8(this.index + i));
        }
        this.index += len;
        return s;
    }

    _ReadNullTerminatedString() {
        var s = "";
        while(true) {
            var b = this.reader.getUint8(this.index);
            this.index++;
            if(b == 0) {
                break;
            } else {
                s += String.fromCharCode(b);
            }
        }
        return s;
    }

    _ReadInt32() {
        var v = this.reader.getInt32(this.index, true);
        this.index += 4;
        return v;
    }

    _ReadInt16() {
        var v = this.reader.getInt16(this.index, true);
        this.index += 2;
        return v;
    }

    _ReadUInt16() {
        var v = this.reader.getUint16(this.index, true);
        this.index += 2;
        return v;
    }

    _ReadSingleFloat() {
        var v = this.reader.getFloat32(this.index, true);
        this.index += 4;
        return v;
    }

    static ReadStringFromBuffer(buf, offset, len) {
        var s = "";
        for (var i = 0; i < len; i += 1) {
            s += String.fromCharCode(buf.getUint8(offset + i));
        }
        return s;
    }

}