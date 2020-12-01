import DeltaEventDispatcher from "../../DeltaEventDispatcher";
import DeltaObject from "../../DeltaObject";

export default class DeltaContentFilter extends DeltaObject {

    constructor(conn, bucket) {
        super(conn);
        this.bucket = bucket;
        this.content = bucket.content.slice(0, bucket.content.length);
        this.filters = [];

        //Make events
        this.OnContentAdded = new DeltaEventDispatcher(); //Fired on new content not currently known about by users
        this.OnContentUpdated = new DeltaEventDispatcher(); //Fired with content that has been updated and is known about by the user
        this.OnContentRemoved = new DeltaEventDispatcher(); //Fired on content that the user knows about being removed
        this.OnContentChanged = new DeltaEventDispatcher(); //Hybrid of the previous three, called with parameters for all

        //Subscribe
        this.bucket.OnContentAdded.Subscribe((evt) => this._AddContent(evt.content));
        this.bucket.OnContentRemoved.Subscribe((evt) => this._RemoveContent(evt.content));
    }

    /*
        Adds a filter to the list and updates the content.

        @filter: A function that will return a boolean specifying if the content was filtered, in this form:
            ([object] entity)
    */
    AddFilter(filter) {
        //Add
        this.filters.push(filter);

        //Update
        this.RefreshFilters();
    }

    /*
        Manually checks all of the content again to see if they match filters. Slow
    */
    RefreshFilters() {
        //Check all
        var added = [];
        var removed = [];

        //Loop through the bucket content
        for(var i = 0; i<this.bucket.content.length; i+=1) {
            var c = this.bucket.content[i];
            var filterPassed = this._FilterEntity(c);
            var index = this.content.indexOf(c);
            if(index == -1 && filterPassed) {
                //Add; Not in the content, and is OK
                this.content.push(c);
                added.push(c);
            } else if (index != -1 && !filterPassed) {
                //Remove; This is in the content and is NO LONGER allowed by the filter
                this.content.splice(index, 1);
                removed.push(c);
            }
        }

        //Fire events
        this._FireEvents(added, removed, []);
    }

    //Checks if an entity, e, matches all of the filters and returns a boolean
    _FilterEntity(e) {
        for(var i = 0; i<this.filters.length; i+=1) {
            if(!this.filters[i](e)) {return false;}
        }
        return true;
    }

    //Fires events only if needed
    _FireEvents(added, removed, updated) {
        if(added.length > 0) {
            this.OnContentAdded.Fire({"added": added});
        }
        if(updated.length > 0) {
            this.OnContentUpdated.Fire({"updated": updated});
        }
        if(removed.length > 0) {
            this.OnContentRemoved.Fire({"removed": removed});
        }
        if(added.length > 0 || updated.length > 0 || removed.length > 0) {
            this.OnContentChanged.Fire({"added": added, "updated": updated, "removed": removed});
        }
    }

    //Adds an array of content, filtering it as it goes. This can be used with existing content in the array to check them again
    _AddContent(content) {
        //Check all
        var added = [];
        var removed = [];
        var updated = [];
        for(var i = 0; i<content.length; i+=1) {
            var c = content[i];
            var filterPassed = this._FilterEntity(c);
            var index = this.content.indexOf(c);
            if(index == -1 && filterPassed) {
                //Add; Not in the content, and is OK
                this.content.push(c);
                added.push(c);
            } else if (index == -1 && !filterPassed) {
                //Do nothing; Not in the content and not passed by the filter
            } else if (index != -1 && filterPassed) {
                //Add this to updated event params; This is in the content and is still allowed by the filter
                updated.push(c);
            } else if (index != -1 && !filterPassed) {
                //Remove; This is in the content and is NO LONGER allowed by the filter
                this.content.splice(index, 1);
                removed.push(c);
            }
        }

        //Fire events
        this._FireEvents(added, removed, updated);
    }

    //Removes an array of content
    _RemoveContent(content) {
        //Check all
        var removed = [];
        for(var i = 0; i<content.length; i+=1) {
            var c = content[i];
            var index = this.content.indexOf(c);
            if(index != -1) {
                //Clients know about this content. Remove it
                this.content.splice(index, 1);
                removed.push(c);
            }
        }

        //Fire events
        this._FireEvents([], removed, []);
    }

}