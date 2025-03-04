"use strict";

var fs = require( "fs" );
var parseString = require( "xml2js" ).parseString;

var parse = {};

function getCounter( source, type ) {
    return source.counter.filter( function ( counter ) 
    {
        return counter.$.type === type;
    })[0];
}

var unpackage = function ( report )
{
    var packages = report.package;

    var output = []

    packages.forEach( function ( pack )
    {
        var cov = pack.sourcefile.map( function ( s ) 
        {
            var fullPath = pack.$.name + '/' + s.$.name
            var className = fullPath.substring( 0, fullPath.lastIndexOf( '.' ) );

            var c = pack.class.filter( function( cl ) 
            {
                return cl.$.name == className;
            })[0];

            var methods = getCounter( s, "METHOD" );
            var lines = getCounter( s, "LINE" );
            var branches = getCounter( s, "BRANCH" );

            var classCov = {
                title: s.$.name,
                file: fullPath,
                functions: {
                    found: Number( methods.$.covered ) + Number( methods.$.missed ),
                    hit:  Number( methods.$.covered ),
                    details: !c.method ? [] : c.method.map( function ( m )
                    {
                        var hit = m.counter.some( function ( counter ) 
                        {
                            return counter.$.type == "METHOD" && counter.$.covered == "1";
                        });
                        return {
                            name: m.$.name,
                            line: Number( m.$.line ),
                            hit: hit ? 1 : 0
                        };
                    } )
                },
                lines: {
                    found: Number( lines.$.covered ) + Number( lines.$.missed ),
                    hit:  Number( lines.$.covered ),
                    details: !s.line ? [] : s.line.map( function ( l )
                    {
                        return {
                            line: Number( l.$.nr ),
                            hit: Number( l.$.ci )
                        };
                    } )
                },
                branches: {
                    found: Number( branches.$.covered ) + Number( branches.$.missed ),
                    hit:  Number( branches.$.covered ),
                    details: !s.line ? [] : [].concat.apply( [], 
                        s.line.filter( function ( l ) 
                        {
                            return Number( l.$.mb ) > 0 || Number( l.$.cb ) > 0;
                        })
                        .map( function ( l )
                        {
                            var branches = [];
                            var count = Number( l.$.mb ) + Number( l.$.cb );

                            for ( var i = 0; i < count; ++i ) 
                            {
                                branches = branches.concat( {
                                    line: Number( l.$.nr ),
                                    block: 0,
                                    branch: Number( i ),
                                    taken:  i < Number( l.$.cb ) ? 1 : 0
                                } )
                            }

                            return branches;
                        } )
                    )
                }
            };

            return classCov;
        });

        output = output.concat( cov );
    });

    return output;
};

parse.parseContent = function ( xml, cb )
{
    parseString( xml, function ( err, parseResult )
    {
        if( err )
        {
            return cb( err );
        }

        var result = unpackage( parseResult.report );

        cb( err, result );
    } );
};

parse.parseFile = function( file, cb )
{
    fs.readFile( file, "utf8", function ( err, content )
    {
        if( err )
        {
            return cb( err );
        }

        parse.parseContent( content, cb );
    } );
};

module.exports = parse;
