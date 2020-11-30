# Delta Primal Data

Primal Data is content that exists in an installation of ARK. It is not user created, and is not belonging to any player. This data is essential to the app, and without it no data exists on any items. It translates object classnames ("Raptor_Character_BP", for example) to usable data. 

This data currently exists in two different categories:

* Species
* Items

## How we get this data

First, we query the server for a list of packages. In prod, we connect to ``https://charlie-packages.deltamap.net/query`` in order to gather a list of packages. We send the mod IDs we want (0 for the base game) as well as the last time they were updated, and the server will tell us the number of NEW entries we should download. We download these and store them in a local browser database.

## API Usage

First, we need to obtain a ``DeltaPrimalPackageInterface`` from a ``DeltaPrimalPackageManager``. The manager is stored in a DeltaConnection. To get an interface, we use the manager in the connection and pass in an array of mod IDs...

```js
var primalInterface = await conn.primaldata.RequestInterface(["0"]);
```

**Mod ID "0" is the base ARK game. You'll need to include it.** The ordering of this also matters, as later IDs will overwrite newer ones.

Now, we should get the total number of new entries to download so we can show the user a progress bar. Call ``GetTotalEntityCount`` on the interface and store the result.

```js
var total = primalInterface.GetTotalEntityCount();
```

Next, download the data and provide a callback to get updates on the progress being made. This callback is where you will want to update the UI as well.

```js
var progress = 0;
await primalInterface.DownloadContent((p) => {
    progress += p;
    console.log(progress); //or, update the UI
});
```

The interface is now ready to be used.