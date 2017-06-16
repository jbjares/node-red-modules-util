/**
 * Created by jbjares on 16/06/2017.
 */

/**
 * Created by jbjares on 16/06/2017.
 */
/**
 * Created by jbjares on 16/06/2017.
 */
//var copyNodeModule = require('copy-node-modules');

(function () {
    var readJson = require('read-package-json');
    readJson('package.json', console.error, false, function (er, data) {
        if (er) {
            console.error("There was an error reading the file")
            return
        }
        var dependencies = JSON.stringify(data.dependencies);
        var dependencyArr = dependencies.split(",");
        for(i in dependencyArr){
            var dependency = dependencyArr[i];
            if(dependency.includes("node")){
                console.log('package name:' + dependency);
                executeCopy("/node_modules","/nodes",dependency);
            }
        }

    });





}());


var test = require('./../index.js').copyOne();
var executeCopy = test.copyNodeModule("../", "nodes","test", {devDependencies: false}, function(err, results) {
    if (err) {
        console.error(err);
        return;
    }
    for (var i in results) {
        if(results[i].name.includes("node-red")){
            console.log('package name:' + results[i].name + ' version:' + results[i].version);
        }

    }
});
