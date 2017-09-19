const Range = require( '../src/range');
const chai = require('chai');
const debug = require('debug')('abstract-query~tests');
const expect = chai.expect;

describe('Range', () => {

    it('can create equals', () => {
    	let range1 = Range.equals(37);
    	expect(range1.value).to.equal(37);
    	expect(range1.isEquals()).to.be.true;
    });

    it('correct containment for equals', () => {
    	let range1 = Range.equals(37);
    	let range2 = Range.equals(14);
    	let range3 = Range.equals(37);

    	expect(range1.contains(range2)).to.be.false;
    	expect(range2.contains(range1)).to.be.false;
    	expect(range1.contains(range3)).to.be.true;
    });

    it('correct intersection for equals', () => {
    	let range1 = Range.equals(37);
    	let range2 = Range.equals(14);
    	let range3 = Range.equals(37);

    	expect(range1.intersect(range2)).to.not.exist;
    	expect(range2.intersect(range1)).to.not.exist;
    	expect(range1.intersect(range3)).to.deep.equal(range1);
    });

    it('correct equality for equals', () => {
    	let range1 = Range.equals(37);
    	let range2 = Range.equals(14);
    	let range3 = Range.equals(37);

    	expect(range1.equals(range2)).to.be.false;
    	expect(range2.equals(range1)).to.be.false;
    	expect(range1.equals(range3)).to.be.true;
    });
});
