const Range = require( '../src/range');
const Cube = require( '../src/cube');
const chai = require('chai');
const debug = require('debug')('abstract-query~tests');
const expect = chai.expect;
const assert = chai.assert;


describe('Cube', () => {

    it('can create cube', () => {
    	let cube1 = new Cube( { x: Range.equals(43), y: Range.equals(33) });
    	expect(cube1.x).to.deep.equal(Range.equals(43));
    	expect(cube1.y).to.deep.equal(Range.equals(33));
    });

    it('has working contains method in 2d', ()=> {
    	// Test with equals
    	let cube1 = new Cube( { x: Range.equals(43), y: Range.equals(33) });
    	let cube2 = new Cube( { x: Range.equals(33), y: Range.equals(43) });
    	let cube3 = new Cube( { x: Range.equals(43), y: Range.equals(99) });
    	let cube4 = new Cube( { x: Range.equals(22), y: Range.equals(33) });
    	let cube5 = new Cube( { x: Range.equals(43), y: Range.equals(33) });

    	expect(cube1.contains(cube2)).to.be.false;
    	expect(cube1.contains(cube3)).to.be.false;
    	expect(cube1.contains(cube4)).to.be.false;
    	expect(cube1.contains(cube5)).to.be.true;

    	// Expand as we add other range types
    });

    it('has working remove constraints operation in 2d', () => {
    	let cube1 = new Cube( { x: Range.equals(43), y: Range.equals(33) });

		let cube2 = cube1.removeConstraints({x: Range.equals(43)});    	
    	expect(cube2.x).to.not.exist;
    	expect(cube1.y).to.deep.equal(Range.equals(33));

    	try {
    		cub1.removeConstraints('x', Range.equals(33));
    		assert(false, "should fail removing incompatible range on x");
    	} catch (err) {
    		// ok
    	}

    	try {
    		cub1.removeConstraints('z', Range.equals(33));
    		assert(false, "should fail removing range on unknown dimension");
    	} catch (err) {
    		// ok
    	}

    });

});