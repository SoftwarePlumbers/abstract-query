const Range = require( '../src/range');
const Cube = require( '../src/cube');
const { $ } = require('../src/param');
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

    it('can bind parameters', () =>{
        let cube1 = new Cube( { x: [22, $.param1], y : [$.param2, $.param3], z: { type: $.param4 } } );
        let cube2 = cube1.bind({ param5: 'slartibartfast'});
        expect(cube2).to.deep.equal(cube1);
        let cube3 = cube1.bind({ param1: 44, param3: 66});
        expect(cube3).to.deep.equal(new Cube( { x: [22, 44], y: [$.param2, 66], z: { type: $.param4 } }));
        let cube4 = cube1.bind({ param1: 20, param3: 66});
        expect(cube4).to.be.null;
        let cube5 = cube1.bind({ param1: 44, param2: 11, param3: 66, param4: 'idiocy'});
        expect(cube5).to.deep.equal(new Cube( { x: [22, 44], y: [11, 66], z: { type: 'idiocy' } }));
    });

});