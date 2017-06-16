'use strict';
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var jsonfile = require('jsonfile');
var semver = require('semver');
var async = require('async');
var ncp = require('ncp').ncp;
var uniqWith = require('lodash.uniqwith');
var flatten = require('lodash.flatten');
var g_opts = {};

function isDirExists(directory)
{
    try
    {
        var stats = fs.lstatSync(directory);
        if (stats.isDirectory())
            return true;
    }
    catch(e)
    {
        return false;
    }
    return false;
}

function getPackageJson(pkgFolder)
{
    var pkgPath = path.resolve(pkgFolder, './package.json');
    var pkgContent = null;
    try
    {
        pkgContent = jsonfile.readFileSync(pkgPath, {throws: false});

    }
    catch(e)
    {
        // skip missing modules
        return null;
    }
    return pkgContent;
}

function hasPackage(pkg, pkgs)
{
    for (var i = 0; i < pkgs.length; ++i)
    {
        if (pkgs[i].name === pkg.name  && pkgs[i].version === pkg.version)
            return true;
    }
    return false;
}

function addPkgDeps(baseDir, pkg, pkgs, callback)
{
    var pkgDir = path.resolve(baseDir, './node_modules/' + pkg.name);
    //console.log('checking dir:' + pkgDir);
    var pkgContent = getPackageJson(pkgDir);
    if (!pkgContent)
        return;

    if (hasPackage(pkgContent, pkgs))
    {
        //console.log('existed, pkg:' + pkgContent.name + ' ver:' + pkgContent.version) ;
        return;
    }

    if (baseDir === g_opts.srcDir)
    {
        if (!semver.validRange(pkg.version))
        {
            pkgs.push({name: pkgContent.name, version: pkgContent.version});
        }
        else if (semver.satisfies(pkgContent.version, pkg.version))
            pkgs.push({name: pkgContent.name, version: pkgContent.version});
        else
            return;
    }

    // recursive search sub modules
    var subPkgBase = path.resolve(pkgDir, './node_modules');
    if (isDirExists(subPkgBase))
    {
        var subPkgs = fs.readdirSync(subPkgBase);
        for (var i in subPkgs)
        {
            var subPkgName = subPkgs[i];
            addPkgDeps(pkgDir, {name: subPkgName, version: '*'}, pkgs, callback);
        }
    }

    for (var pkgName in pkgContent.dependencies)
    {
        var version = pkgContent.dependencies[pkgName];
        var depPkg = {name: pkgName, version: version};
        addPkgDeps(g_opts.srcDir, depPkg, pkgs, callback);
        addPkgDeps(pkgDir, depPkg, pkgs, callback);
    }


}

function findPkgDeps(pkg, callback)
{
    var pkgs = [];
    addPkgDeps(g_opts.srcDir, pkg, pkgs, callback);
    callback(null, pkgs);
}


function copyModules(pkgContent, callback)
{
    var pkg = pkgContent.name;
    var srcDir = path.resolve(g_opts.srcDir, './node_modules/' + pkg);
    var dstDir = path.resolve(g_opts.dstDir, './' + pkg);
    var opts = {clobber: false};
    mkdirp.sync(dstDir);
    ncp(srcDir, dstDir, opts, function(err) {
        callback(err);
    });
}

function copyNodeModules(srcDir, dstDir, opts, callback)
{
    if (!srcDir)
        throw new Error('missing source diretory argument');
    if (!dstDir)
        throw new Error('missing destination diretory argument');

    if (!callback)
    {
        g_opts = {srcDir: srcDir, dstDir: dstDir, devDependencies: false};
        callback = opts;
    }
    else
    {
        g_opts = opts || {};
        g_opts.srcDir = srcDir;
        g_opts.dstDir = dstDir;
    }

    var pkgPath = path.resolve(srcDir, './package.json');
    var pkgContent = jsonfile.readFileSync(pkgPath, {throws: false});
    if (!pkgContent)
        throw new Error('parse package.json in source directory fail');


    // prepare root package list
    var rootPkgList = [];
    for (var depPkgName in pkgContent.dependencies)
        rootPkgList.push({name: depPkgName, version: pkgContent.dependencies[depPkgName]});

    if (g_opts.devDependencies)
    {
        for (var devDepPkgName in pkgContent.devDependencies)
            rootPkgList.push({name: devDepPkgName, version: pkgContent.dependencies[devDepPkgName]});
    }

    async.map(rootPkgList, findPkgDeps, function(err, results) {
        if (err)
        {
            callback(err);
            return;
        }

        var dstModuleDir = path.resolve(g_opts.dstDir, "./node_modules");
        fs.stat(dstModuleDir, function(err, stat) {
            if (err || !stat.isDirectory())
            {
                if (!mkdirp.sync(dstModuleDir))
                {
                    callback('Can not create destination node_modules directory');
                    return;
                }
            }

            var allPkgList = uniqWith(flatten(results), function(a, b) {
                if (a.name === b.name && a.version === b.version)
                    return true;
                return false;
            });

            async.each(allPkgList, copyModules, function(err) {
                callback(err, allPkgList);
            });
        });
    });
}


//

function copyNodeModule(srcDir, dstDir, nodeModule, opts, callback)
{
    console.log(nodeModule);
    console.log(dstDir);
    console.log(srcDir);
    if (!srcDir)
        throw new Error('missing source diretory argument');
    if (!dstDir)
        throw new Error('missing destination diretory argument');
    if (!nodeModule)
        throw new Error('missing moduleName argument');

    if (!callback)
    {
        g_opts = {srcDir: srcDir, dstDir: dstDir, devDependencies: false};
        callback = opts;
    }
    else
    {
        g_opts = opts || {};
        g_opts.srcDir = srcDir;
        g_opts.dstDir = dstDir;
    }

    var pkgPath = path.resolve(srcDir, './package.json');
    var pkgContent = jsonfile.readFileSync(pkgPath, {throws: false});
    if (!pkgContent)
        throw new Error('parse package.json in source directory fail');


    // prepare root package list
    var rootPkgList = [];
    for (var depPkgName in pkgContent.dependencies){
        console.log(depPkgName);
        if(nodeModule==depPkgName){
            rootPkgList.push({name: depPkgName, version: pkgContent.dependencies[depPkgName]});
        }
        if (g_opts.devDependencies)
        {
            for (var devDepPkgName in pkgContent.devDependencies){
                rootPkgList.push({name: devDepPkgName, version: pkgContent.dependencies[devDepPkgName]});
            }

        }
    }

    console.log(rootPkgList.length);
    if(rootPkgList.length == 0){
        return;
    }
    console.log(rootPkgList.length);

    console.log('rootPkgList[0]: '+rootPkgList[0])
    async.map(rootPkgList, findPkgDeps, function(err, results) {
        if (err)
        {
            callback(err);
            return;
        }

        var dstModuleDir = path.resolve(g_opts.dstDir, "");
        fs.stat(dstModuleDir, function(err, stat) {
            if (err || !stat.isDirectory())
            {
                if (!mkdirp.sync(dstModuleDir))
                {
                    callback('Can not create destination node_modules directory');
                    return;
                }
            }

/*            var allPkgList = uniqWith(flatten(results), function(a, b) {
                console.log('a name: '+a.name+'b name: '+ b.name);

                if (a.name === b.name && a.version === b.version){
                    console.log('true');
                    return true;
                }else{
                    console.log('false');
                    return false;
                }
            });*/

            console.log('before async copyModules');
            console.log('copyModules');
            async.each(rootPkgList, copyModules, function(err) {
                callback(err, rootPkgList);
                console.log('err: '+err);
            });
/*            async.each(allPkgList, copyModules, function(err) {
                callback(err, allPkgList);
                console.log('err: '+err);
            });*/
            console.log('fim');
        });
    });
}


//module.exports = copyNodeModules;
module.exports.copyOne = copyNodeModule;
module.exports.copyAll = copyNodeModules;