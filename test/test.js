/**
 * Required modules
 */
require('must/register');
const exec = require( 'child-process-promise' ).exec;
const playgroundUrl = require( './../config/test.json' ).playgroundUrl;


describe( 'Octopus Playground', () => {

    it( `octopus ${playgroundUrl} --silent`, done => {

        exec( `octopus ${playgroundUrl} --silent` ).then( result => {

            const data = result.stdout.trim();

            data.must.include( 'https://exsuperreal.de/' );
            data.must.include( 'STATUS MSG: ENOTFOUND (0)' );

            data.must.include( 'https://sites.google.com/a/superreal.de/octopus/null' );
            data.must.include( 'APPEARS ON: https://sites.google.com/a/superreal.de/octopus/' );
            data.must.include( 'STATUS MSG: NOT FOUND (404)' );

            data.must.include( '29 links checked' );

            done();

        } )

    } );


    it( `octopus ${playgroundUrl} --silent --ignore-query=continue`, done => {

        exec( `octopus ${playgroundUrl} --silent --ignore-query=continue` ).then( result => {

            const data = result.stdout.trim();

            data.must.include( 'https://exsuperreal.de/' );
            data.must.include( 'STATUS MSG: ENOTFOUND (0)' );

            data.must.include( 'https://sites.google.com/a/superreal.de/octopus/null' );
            data.must.include( 'APPEARS ON: https://sites.google.com/a/superreal.de/octopus/' );
            data.must.include( 'STATUS MSG: NOT FOUND (404)' );

            data.must.include( '20 links checked' );

            done();

        } )

    } );


    it( `octopus ${playgroundUrl} --silent --ignore-external`, done => {

        exec( `octopus ${playgroundUrl} --silent --ignore-external` ).then( result => {

            const data = result.stdout.trim();

            data.must.not.include( 'https://exsuperreal.de/' );
            data.must.not.include( 'STATUS MSG: ENOTFOUND (0)' );

            data.must.include( 'https://sites.google.com/a/superreal.de/octopus/null' );
            data.must.include( 'APPEARS ON: https://sites.google.com/a/superreal.de/octopus/' );
            data.must.include( 'STATUS MSG: NOT FOUND (404)' );

            data.must.include( '13 links checked' );

            done();

        } )

    } );


    it( `octopus ${playgroundUrl} --silent --ignore-nofollow`, done => {

        exec( `octopus ${playgroundUrl} --silent --ignore-nofollow` ).then( result => {

            const data = result.stdout.trim();

            data.must.not.include( 'https://exsuperreal.de/' );
            data.must.not.include( 'STATUS MSG: ENOTFOUND (0)' );

            data.must.not.include( 'https://sites.google.com/a/superreal.de/octopus/null' );
            data.must.not.include( 'APPEARS ON: https://sites.google.com/a/superreal.de/octopus/' );
            data.must.not.include( 'STATUS MSG: NOT FOUND (404)' );

            data.must.include( '26 links checked' );

            done();

        } )

    } );

} );
