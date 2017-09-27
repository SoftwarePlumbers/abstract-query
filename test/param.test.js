const { Param, $ } = require( '../src/param');
const chai = require('chai');
const debug = require('debug')('abstract-query~tests');
const expect = chai.expect;

describe('Param', () => {

    it('can create parameter with factory ', () => {
    	expect($.myparam).to.deep.equal(Param.from('myparam'));
    });

    it('has appropriate equals method', () => {
    	expect($.myparam.equals(Param.from('myparam'))).to.be.true;
    });


    it('has sane JSON representation', () => {
    	expect(JSON.stringify($.myparam)).to.equal('{"$":"myparam"}');
    });

    it('can be constructed from JSON representation', () => {
    	expect(Param.from({$:'myparam'})).to.deep.equal($.myparam);
    });
});