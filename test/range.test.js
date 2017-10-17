const Range = require( '../src/range');
const { Param, $ } = require('../src/param');
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
        expect(range1.operator).to.equal('between');
    	expect(range1.upper_bound.equals(Range.lessThan(37))).to.be.true;
    	expect(range1.lower_bound.equals(Range.greaterThanOrEqual(14))).to.be.true;
    });

    it('can create subquery', () => {
    	let range1 = Range.from({ name: 'test'});
    	expect(range1.query.union[0].name).to.deep.equal(Range.equals('test'));
    });

    it('can create has', () => {
        let range1 = Range.has(['mytag']);
        expect(range1.bounds[0]).to.deep.equal(Range.equals('mytag'));
        range1 = Range.has([{ ">": 'bound'}]);
        expect(range1.bounds[0]).to.deep.equal(Range.greaterThan('bound'));
    });

    it('can create ranges from bounds object', ()=>{
    	let range1 = Range.fromBounds({'=':5});
    	expect(range1).to.deep.equal(Range.equals(5));
    	range1 = Range.fromBounds({'<':5});
    	expect(range1).to.deep.equal(Range.lessThan(5));
    	range1 = Range.fromBounds({'>':5});
    	expect(range1).to.deep.equal(Range.greaterThan(5));
    	range1 = Range.fromBounds({'<=':5});
    	expect(range1).to.deep.equal(Range.lessThanOrEqual(5));
    	range1 = Range.fromBounds({'>=':5});
    	expect(range1).to.deep.equal(Range.greaterThanOrEqual(5));
        range1 = Range.fromBounds({$has: [{'=':5}]});
        expect(range1).to.deep.equal(Range.has([Range.equals(5)]));

    });

    it('toBoundsObject creates bounds objects', ()=>{
    	let range1 = Range.fromBounds({'=':5});
    	expect(range1.toBoundsObject()).to.deep.equal({'=':5});
    	range1 = Range.fromBounds({'<':5});
    	expect(range1.toBoundsObject()).to.deep.equal({'<':5});
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
		let range9 = Range.from({ name: 'morgan'});
		let range10 = Range.from({ name: 'freeman'});
		let range11 = Range.from({ name: 'morgan'});
		expect (range9.equals(range10)).to.be.false;
		expect (range9.equals(range11)).to.be.true;

    });

    it('can compare parametrized ranges with equals', () => {
        let range1 = Range.equals(37);
        let range2 = Range.equals($.param1);
        let range3 = Range.equals($.param2);
        let range4 = Range.equals($.param1);
        expect (range2.equals(range3)).to.be.null;
        expect (range2.equals(range4)).to.be.true;
        expect (range2.equals(range1)).to.be.null;
        expect (range1.equals(range2)).to.be.null;

        let range5 = Range.lessThan($.param1);
        let range6 = Range.lessThan($.param1);
        let range7 = Range.lessThan($.param2);
        expect(range5.equals(range6)).to.be.true;
        expect(range5.equals(range7)).to.be.null;
        expect(range1.equals(range5)).to.be.false;

        let range8 = Range.from([5, $.param2]);
        let range9 = Range.from([5, $.param1]);
        let range10 = Range.from([5, $.param2]);
        let range11 = Range.from([4, $.param2]);
        expect(range8.equals(range9)).to.be.null;
        expect(range8.equals(range10)).to.be.true;
        expect(range8.equals(range11)).to.be.false;
    });

    it('correct containment for equals', () => {
    	let range1 = Range.equals(37);
    	let range2 = Range.equals(14);
    	let range3 = Range.equals(37);

    	expect(range1.contains(range2)).to.be.false;
    	expect(range2.contains(range1)).to.be.false;
    	expect(range1.contains(range3)).to.be.true;
    });


    it('correct containment for equals with parameters', () => {
        let range1 = Range.equals(37);
        let range2 = Range.equals($.param);

        expect(range1.contains(range2)).to.be.null;
        expect(range2.contains(range1)).to.be.null;
    });

    it('correct containment for lessThan', () => {
    	let range1 = Range.lessThan(37);
    	let range2 = Range.lessThan(14);
    	let range3 = Range.lessThan(37);

    	expect(range1.contains(range2)).to.be.true;
    	expect(range2.contains(range1)).to.be.false;
    	expect(range1.contains(range3)).to.be.true;
    });

    it('correct containment for lessThan with parameters', () => {
        let range1 = Range.lessThan(37);
        let range2 = Range.lessThan($.param);
        let range3 = Range.lessThan($.param);

        expect(range1.contains(range2)).to.be.null;
        expect(range2.contains(range1)).to.be.null;
        expect(range2.contains(range3)).to.be.true;
    });

    it('correct containment for lessThan and intersection', () => {
        let range1 = Range.lessThan(37);
        let range2 = Range.lessThan($.param1);
        let range3 = Range.lessThan($.param2);
        let range4 = range1.intersect(range2).intersect(range3);
        let range5 = Range.greaterThan($.param1);
        let range7 = Range.lessThan(8);

        expect(range1.contains(range4)).to.be.true;
        expect(range2.contains(range4)).to.be.true;
        expect(range3.contains(range4)).to.be.true;
        expect(range5.contains(range4)).to.be.false;
        expect(range7.contains(range4)).to.be.null;
    });

    it('correct containment for lessThanOrEqual', () => {
    	let range1 = Range.lessThanOrEqual(37);
    	let range2 = Range.lessThanOrEqual(14);
    	let range3 = Range.lessThanOrEqual(37);

    	expect(range1.contains(range2)).to.be.true;
    	expect(range2.contains(range1)).to.be.false;
    	expect(range1.contains(range3)).to.be.true;
    });

    it('correct containment for lessThanOrEqual', () => {
        let range1 = Range.lessThanOrEqual(37);
        let range2 = Range.lessThanOrEqual($.param);
        let range3 = Range.lessThanOrEqual($.param);

        expect(range1.contains(range2)).to.be.null;
        expect(range2.contains(range1)).to.be.null;
        expect(range2.contains(range3)).to.be.true;
    });

    it('correct containment for lessThanOrEqual/lessThan/equals', () => {
    	let range1 = Range.lessThanOrEqual(37);
    	let range2 = Range.equals(37);
    	let range3 = Range.lessThan(37);

    	expect(range1.contains(range3)).to.be.true;
    	expect(range1.contains(range2)).to.be.true;
    	expect(range3.contains(range1)).to.be.false;
    	expect(range3.contains(range2)).to.be.false;
    });

    it('correct containment for lessThanOrEqual/lessThan/equals with parameters', () => {
        let range1 = Range.lessThanOrEqual($.param);
        let range2 = Range.equals($.param);
        let range3 = Range.lessThan($.param);


        expect(range1.contains(range3)).to.be.true;
        expect(range1.contains(range2)).to.be.true;
        expect(range3.contains(range1)).to.be.false;
        expect(range3.contains(range2)).to.be.false;
    });

    it('correct containment for greaterThan', () => {
    	let range1 = Range.greaterThan(37);
    	let range2 = Range.greaterThan(14);
    	let range3 = Range.greaterThan(37);

    	expect(range1.contains(range2)).to.be.false;
    	expect(range2.contains(range1)).to.be.true;
    	expect(range1.contains(range3)).to.be.true;
    });

    it('correct containment for greaterThanOrEqual', () => {
    	let range1 = Range.greaterThanOrEqual(37);
    	let range2 = Range.greaterThanOrEqual(14);
    	let range3 = Range.greaterThanOrEqual(37);

    	expect(range1.contains(range2)).to.be.false;
    	expect(range2.contains(range1)).to.be.true;
    	expect(range1.contains(range3)).to.be.true;
    });

    it('correct containment for greaterThanOrEqual/greterThan/equals', () => {
    	let range1 = Range.greaterThanOrEqual(37);
    	let range2 = Range.equals(37);
    	let range3 = Range.greaterThan(37);

    	expect(range1.contains(range3)).to.be.true;
    	expect(range1.contains(range2)).to.be.true;
    	expect(range3.contains(range1)).to.be.false;
    	expect(range3.contains(range2)).to.be.false;
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

    it('correct containment for greaterThan/lessThan with parameters', ()=>{
        let range1 = Range.greaterThan($.param1);
        let range2 = Range.greaterThan($.param2);
        let range3 = Range.lessThan($.param1);
        let range4 = Range.lessThan($.param2);

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

    it('correct containment for between with parameters', () => {
        let range1 = Range.between(14,$.param1);
        let range2 = Range.between(15,$.param1);
        let range3 = Range.between($.param1,15);
        let range4 = Range.between($.param1,14);
        expect(range1.contains(range2)).to.be.true;
        expect(range3.contains(range4)).to.be.true;
    });

    it('correct containment for subquery', ()=>{
    	let range1 = Range.from({count: [3,]});
    	let range2 = Range.from({count: [1,]});
    	expect(range1.contains(range2)).to.be.false;
    	expect(range2.contains(range1)).to.be.true;
    });

    it('correct containment for subquery with parameters', ()=>{
        let range1 = Range.from({count: [$.param1,]});
        let range2 = Range.from({count: [$.param2,]});
        let range3 = Range.from({count: $.param1});
        expect(range1.contains(range2)).to.be.null; // cant tell, contains if $.param1 === $.param2
        expect(range2.contains(range1)).to.be.null;
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

    it('correct intersection for equals with parameters', () => {
        let range1 = Range.equals($.param1);
        let range2 = Range.equals(14);
        let range3 = Range.equals($.param1);

        expect(range1.intersect(range2)).to.deep.equal(Range.and([range1, range2]));
        expect(range2.intersect(range1)).to.deep.equal(Range.and([range2, range1]));
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

    it('correct intersection for lessThan with parameters', () => {
        let range1 = Range.lessThan($.param);
        let range2 = Range.lessThan(14);
        let range3 = Range.lessThan($.param);

        expect(range1.intersect(range2)).to.deep.equal(Range.and([range1, range2]));
        expect(range2.intersect(range1)).to.deep.equal(Range.and([range2, range1]));
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

    it('correct intersection for greaterThan with parameters', () => {
        let range1 = Range.greaterThan($.param);
        let range2 = Range.greaterThan(14);
        let range3 = Range.greaterThan($.param);

        expect(range1.intersect(range2)).to.deep.equal(Range.and([range1, range2]));
        expect(range2.intersect(range1)).to.deep.equal(Range.and([range2, range1]));
        expect(range1.intersect(range3).equals(range1)).to.be.true;
    });

    it('correct intersection for greaterThan/LessThan', () => {
    	let range1 = Range.lessThan(37);
    	let range2 = Range.greaterThan(14);
    	let range3 = Range.lessThan(14);
    	let range4 = Range.greaterThan(37);

    	expect(range1.intersect(range2).equals(Range.from([range2,range1]))).to.be.true;
    	expect(range2.intersect(range1).equals(Range.from([range2,range1]))).to.be.true;
    	expect(range3.intersect(range4)).to.be.null;
    	expect(range4.intersect(range3)).to.be.null;
    });

    it('correct intersection for greaterThan/LessThan with parameters', () => {
        let range1 = Range.lessThan($.param1);
        let range2 = Range.greaterThan($.param2);
        let range3 = Range.lessThan($.param2);
        let range4 = Range.greaterThan($.param1);

        expect(range1.intersect(range2)).to.deep.equal(Range.between(range2,range1));
        expect(range2.intersect(range1)).to.deep.equal(Range.between(range2,range1));
        expect(range1.intersect(range4)).to.be.null;
        expect(range2.intersect(range3)).to.be.null;
        expect(range1.intersect(range3)).to.deep.equal(Range.and([range1,range3]));
        expect(range2.intersect(range4)).to.deep.equal(Range.and([range2,range4]));
    });




    it('correct intersection for subquery', () => {
    	let range1 = Range.from({value: [3,10]});
    	let range2 = Range.from({value: [5,12]});
    	expect(range1.intersect(range2)).to.deep.equal(Range.from({value: [5,10]}));
    });

    it('uses bounds objects in Range.from', () => {
    	let range1 = Range.from({ ">":5});
    	expect(range1).to.deep.equal(Range.greaterThan(5));
    	let range2 = Range.from([2,8]);
    	expect(range2).to.deep.equal(Range.between(2,8));
    	expect(range2.lower_bound).to.deep.equal(Range.greaterThanOrEqual(2));
    	expect(range2.upper_bound).to.deep.equal(Range.lessThan(8));
    	let range3 = Range.from([{">":2}, {"<=":8}])
    	expect(range3.upper_bound).to.deep.equal(Range.lessThanOrEqual(8));
    	expect(range3.lower_bound).to.deep.equal(Range.greaterThan(2));
    });

    it('Can create range with parameter', () => {
        let range1 = Range.lessThan($.bottom);
        expect(range1.value.$).to.equal('bottom');
        let range2 = Range.from([,$.top]);
        expect(range2.value.$).to.equal('top');
    });

    it('Can create range with and', () => {
        let range1 = Range.greaterThanOrEqual($.bottom);
        let range2 = Range.lessThan($.top);
        let range3 = Range.and([range1, range2]);
        expect(range3).to.deep.equal(Range.between($.bottom, $.top));
    });

    it('correct intersection for between', () => {

        let range1 = Range.between(14,37);
        let range2 = Range.between(15,36);
        let range3 = range1.intersect(range2);

        expect(range3.lower_bound).to.deep.equal(Range.from([15,]));
        expect(range3.upper_bound).to.deep.equal(Range.from([,36]));

        let range4 = Range.between(14,17);
        let range5 = Range.between(29,36);
        let range6 = range4.intersect(range5);

        expect(range6).to.be.null;

        let range7 = Range.between(14,17);
        let range8 = Range.between(17,36);
        let range9 = range7.intersect(range8);

        expect(range9).to.be.null;

    });

    it('correct intersection for between with parameters', () => {

        let range1 = Range.between(14,37);
        let range2 = Range.between($.param1,36);
        let range3 = range1.intersect(range2);

        expect(range3.known_bounds).to.deep.equal(Range.between(14,36));
        expect(range3.parametrized_bounds.param1).to.deep.equal(Range.greaterThanOrEqual($.param1));

        let range4 = Range.between(14,$.param1);
        let range5 = Range.between(15,36);
        let range6 = range4.intersect(range5);

        expect(range6.known_bounds).to.deep.equal(Range.between(15,36));
        expect(range6.parametrized_bounds.param1).to.deep.equal(Range.lessThan($.param1));

        let range7 = Range.between(14,$.param1);
        let range8 = Range.between(15,$.param1);
        let range9 = range7.intersect(range8);

        expect(range9).to.deep.equal(Range.between(15, $.param1));

        let range10 = Range.between(14,$.param1);
        let range11 = Range.between($.param1,36);
        let range12 = range10.intersect(range11);

        expect(range12).to.be.null;
    });

    it('can bind parameters', () => {
        let range1 = Range.between($.param1, $.param2).intersect(Range.lessThan(50));
        expect(range1.bind({param1: 34, param2: 55})).to.deep.equal(Range.between(34, 50));
        expect(range1.bind({param1: 34, param2: 45})).to.deep.equal(Range.between(34, 45));
        expect(range1.bind({param2: 45})).to.deep.equal(Range.between($.param1, 45));
        expect(range1.bind({param1: 52})).to.be.null;
    });

    it('can bind parameters for has', () => {
        let range1 = Range.has([$.param1, $.param2]);
        expect(range1.bind({param1: 34, param2: 55})).to.deep.equal(Range.has([34, 55]));
        expect(range1.bind({param1: 34, param2: 34})).to.deep.equal(Range.has([34]));
    });

    it('correct intersection for has', () => {
        let range1 = Range.from({ $has: [6] });
        let range2 = Range.from({ $has: [8] });
        let range3 = range1.intersect(range2);
        expect(range3).to.deep.equal(Range.from({$has: [6,8]}));
    });

});
