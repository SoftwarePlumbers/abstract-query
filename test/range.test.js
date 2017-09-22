const Range = require( '../src/range');
const chai = require('chai');
const debug = require('debug')('abstract-query~tests');
const expect = chai.expect;

describe('Range', () => {

    it('can create equals', () => {
    	let range1 = Range.equals(37);
    	expect(range1.value).to.equal(37);
    	expect(range1.operator).to.equal('=');
    	let range2 = Range.from(37);
    	expect(range1.equals(range2)).to.be.true;
    });

    it('can create lessThan', () => {
    	let range1 = Range.lessThan(37);
    	expect(range1.value).to.equal(37);
    	expect(range1.operator).to.equal('<');
    });

    it('can create greaterThan', () => {
    	let range1 = Range.greaterThan(37);
    	expect(range1.value).to.equal(37);
    	expect(range1.operator).to.equal('>');
    });

    it('can create between', () => {
    	let range1 = Range.between(14, 37);
    	expect(range1.upper_bound.equals(Range.lessThan(37))).to.be.true;
    	expect(range1.lower_bound.equals(Range.greaterThan(14))).to.be.true;
    	expect(range1.operator).to.equal('between');
    });

    it('can compare ranges with equals', () => {
		let range1 = Range.equals(37);
		let range2 = Range.equals(37);
		expect(range1.equals(range2)).to.be.true;
		let range3 = Range.equals(14);
		expect(range1.equals(range3)).to.be.false;
		let range4 = Range.lessThan(37);
		expect(range1.equals(range4)).to.be.false;
		let range5 = Range.lessThan(37);
		expect(range5.equals(range4)).to.be.true;
		let range6 = Range.from([14,37]);
		let range7 = Range.from([14,37]);
		expect(range6.equals(range7)).to.be.true;
		let range8 = Range.from([15,37]);
		expect(range6.equals(range8)).to.be.false;
    });

    it('correct containment for equals', () => {
    	let range1 = Range.equals(37);
    	let range2 = Range.equals(14);
    	let range3 = Range.equals(37);

    	expect(range1.contains(range2)).to.be.false;
    	expect(range2.contains(range1)).to.be.false;
    	expect(range1.contains(range3)).to.be.true;
    });

    it('correct containment for lessThan', () => {
    	let range1 = Range.lessThan(37);
    	let range2 = Range.lessThan(14);
    	let range3 = Range.lessThan(37);

    	expect(range1.contains(range2)).to.be.true;
    	expect(range2.contains(range1)).to.be.false;
    	expect(range1.contains(range3)).to.be.true;
    });

    it('correct containment for greaterThan', () => {
    	let range1 = Range.greaterThan(37);
    	let range2 = Range.greaterThan(14);
    	let range3 = Range.greaterThan(37);

    	expect(range1.contains(range2)).to.be.false;
    	expect(range2.contains(range1)).to.be.true;
    	expect(range1.contains(range3)).to.be.true;
    });

    it('correct containment for greaterThan/lessThan', ()=>{
    	let range1 = Range.greaterThan(37);
    	let range2 = Range.greaterThan(14);
    	let range3 = Range.lessThan(37);
    	let range4 = Range.lessThan(14);

    	expect(range1.contains(range3)).to.be.false;
    	expect(range1.contains(range4)).to.be.false;
    	expect(range2.contains(range3)).to.be.false;
    	expect(range2.contains(range4)).to.be.false;
    });

    it('correct containment for between', ()=>{
    	let range1 = Range.between(14,37);
    	let range2 = Range.between(15,36);
    	let range3 = Range.between(13,15);
    	let range4 = Range.between(36,38);
    	let range5 = Range.between(12,13);
    	let range6 = Range.between(38,39);

    	expect(range1.contains(range2)).to.be.true;
    	expect(range1.contains(range3)).to.be.false;
    	expect(range1.contains(range4)).to.be.false;
    	expect(range1.contains(range5)).to.be.false;
    	expect(range1.contains(range6)).to.be.false;
    });

    it('correct intersection for equals', () => {
    	let range1 = Range.equals(37);
    	let range2 = Range.equals(14);
    	let range3 = Range.equals(37);

    	expect(range1.intersect(range2)).to.not.exist;
    	expect(range2.intersect(range1)).to.not.exist;
    	expect(range1.intersect(range3)).to.deep.equal(range1);
    });

    it('correct intersection for lessThan', () => {
    	let range1 = Range.lessThan(37);
    	let range2 = Range.lessThan(14);
    	let range3 = Range.lessThan(37);

    	expect(range1.intersect(range2).equals(range2)).to.be.true;
    	expect(range2.intersect(range1).equals(range2)).to.be.true;
    	expect(range1.intersect(range3).equals(range1)).to.be.true;
    });

    it('correct intersection for greaterThan', () => {
    	let range1 = Range.greaterThan(37);
    	let range2 = Range.greaterThan(14);
    	let range3 = Range.greaterThan(37);

    	expect(range1.intersect(range2).equals(range1)).to.be.true;
    	expect(range2.intersect(range1).equals(range1)).to.be.true;
    	expect(range1.intersect(range3).equals(range1)).to.be.true;
    });

    it('correct intersection for greaterThan/LessThan', () => {
    	let range1 = Range.lessThan(37);
    	let range2 = Range.greaterThan(14);
    	let range3 = Range.lessThan(14);
    	let range4 = Range.greaterThan(37);

    	expect(range1.intersect(range2).equals(Range.from([range2,range1]))).to.be.true;
    	expect(range2.intersect(range1).equals(Range.from([range2,range1]))).to.be.true;
    	expect(range3.intersect(range4)).to.be.undefined;
    	expect(range4.intersect(range3)).to.be.undefined;
    });


    it('correct intersection for between', () => {

    	let range1 = Range.between(14,37);
    	let range2 = Range.between(15,36);
    	let range3 = Range.between(13,15);
    	let range4 = Range.between(36,38);
    	let range5 = Range.between(12,13);
    	let range6 = Range.between(38,39);

    	expect(range1.intersect(range2)).to.deep.equal(range2);
    	expect(range1.intersect(range3)).to.deep.equal(Range.from([14,15]));
    	expect(range1.intersect(range4)).to.deep.equal(Range.from([36,37]));
    	expect(range1.intersect(range5)).to.be.undefined;
    	expect(range1.intersect(range5)).to.be.undefined;
    });



});
