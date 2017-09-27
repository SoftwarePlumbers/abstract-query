const { Param, $ } = require( '../src/param');
const chai = require('chai');
const debug = require('debug')('abstract-query~tests');
const expect = chai.expect;

describe('Param', () => {

    it('can create parameter with factory ', () => {
    	expect($.myparam).to.deep.equal(Param.from('myparam'));
    });
});