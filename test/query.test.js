const { Query, Range } = require( '../src');
const chai = require('chai');
const debug = require('debug')('abstract-query~tests');
const expect = chai.expect;
const assert = chai.assert;


describe('Query', () => {

    it('can create query', () => {
    	let constraints = {x: Range.equals(2), y: Range.equals(4)};
    	let query = Query.fromConstraint(constraints);
    	expect(query.cubes.length).to.equal(1);
    	expect(query.cubes[0]).to.deep.equal(constraints);
    });

    it('can use and to add constraints', () => {
    	let query = Query
    		.fromConstraint({x: 2, y: 4})
    		.and({ z: Range.equals(5)});

    	expect(query.cubes.length).to.equal(1);
    	expect(query.cubes[0]).to.deep.equal({x: Range.equals(2), y: Range.equals(4), z: Range.equals(5)});
    });

    it('can use or to add constraints', () => {
    	let query = Query
    		.fromConstraint({x: Range.equals(2), y: Range.equals(4)})
    		.or({ z: 5});

    	expect(query.cubes.length).to.equal(2);
    	expect(query.cubes[0]).to.deep.equal({ x: Range.equals(2), y: Range.equals(4) });
    	expect(query.cubes[1]).to.deep.equal({ z: Range.equals(5) }); 
    });

    it('redundant constraints are suppressed', () => {
    	let query = Query
    		.fromConstraint({x: Range.equals(2), y: Range.equals(4)})
    		.or({ x: Range.equals(2)});

    	expect(query.cubes.length).to.equal(1);
    	expect(query.cubes[0]).to.deep.equal({ x: Range.equals(2) }); 

    	query = Query
    		.fromConstraint({x: Range.equals(2), y: Range.equals(4)})
    		.and({ x: Range.equals(2)});

    	expect(query.cubes.length).to.equal(1);
    	expect(query.cubes[0]).to.deep.equal({x: Range.equals(2), y: Range.equals(4)}); 
    }); 

    it('creates expression', () => {
    	let query = Query
    		.fromConstraint({x: Range.equals(2), y: Range.equals(4)})
    		.and({ z: Range.equals(5)})
    		.or({x:6, y:3, z:99})

    	let expression = query.toExpression( 
    			(...ands) => '(' + ands.join(') and (') + ')', 
    			(...ors) => ors.join(' or '),
    			([dimension, range]) => dimension + range.operator + range.value
    		);

    	console.log(expression);
    });    


});