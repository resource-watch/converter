
class GeoStoreNotFound extends Error {

    constructor(code, message) {
        super(message);
        this.status = code;
        this.name = 'GeoStoreNotFound';
        this.message = message;
    }

}
module.exports = GeoStoreNotFound;
