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
    		.fromConstraint({x: [,2], y: 4})
    		.and({ z: 5})
    		.or({x:[6,8], y:3, z:99})

    	let expression = query.toExpression( 
    			(...ands) => '(' + ands.join(') and (') + ')', 
    			(...ors) => ors.join(' or '),
    			(dimension, operator, value) => dimension + operator + value
    		);

    	console.log(expression);
    });    

    it('factorizes', () => {
    	let query = Query
    		.fromConstraint({x: 2, y : [3,4], z : 8})
    		.or({x:2, y: [,4], z: 7})
    		.or({x:3, y: [3,], z: 7});

    	let factored_part = Query
    		.fromConstraint({y : [3,4], z : 8})
    		.or({y: [,4], z: 7})

    	let { factored, remainder } = query.factor({ x: 2});

    	expect(remainder).to.deep.equal(Query.fromConstraint({x:3, y: [3,], z: 7}));
    	expect(factored).to.deep.equal(factored_part);

    	let expression = factored.toExpression( 
    			(...ands) => '(' + ands.join(') and (') + ')', 
    			(...ors) => ors.join(' or '),
    			(dimension, operator, value) => dimension + operator + value
    		);

    	console.log(expression);


    });


});