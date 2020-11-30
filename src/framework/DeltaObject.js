//This class is what almost anything in this framework is based on. It has some basic functions and holds a Delta connection

export default class DeltaObject {

    constructor(conn) {
        this.conn = conn;
    }

    Log(topic, msg) {
        this.conn.Log(topic, msg);
    }

}