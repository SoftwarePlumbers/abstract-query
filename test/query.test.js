const { Query, Range } = require( '../src');
const chai = require('chai');
const debug = require('debug')('abstract-query~tests');
const expect = chai.expect;
const assert = chai.assert;


describe('Query', () => {

    it('can create query', () => {
    	let constraints = {x: Range.equals(2), y: Range.equals(4)};
    	let query = Query.from(constraints);
    	expect(query.union.length).to.equal(1);
    	expect(query.union[0]).to.deep.equal(constraints);
    });

    it('can use and to add constraints', () => {
    	let query = Query
    		.from({x: 2, y: 4})
    		.and({ z: Range.equals(5)});

    	expect(query.union.length).to.equal(1);
    	expect(query.union[0]).to.deep.equal({x: Range.equals(2), y: Range.equals(4), z: Range.equals(5)});
    });

    it('can use or to add constraints', () => {
    	let query = Query
    		.from({x: Range.equals(2), y: Range.equals(4)})
    		.or({ z: 5});

    	expect(query.union.length).to.equal(2);
    	expect(query.union[0]).to.deep.equal({ x: Range.equals(2), y: Range.equals(4) });
    	expect(query.union[1]).to.deep.equal({ z: Range.equals(5) }); 
    });

    it('can create subqueries', () => {
    	let query = Query.from({ currency: 'GBP', branch: { country: 'UK', type: 'accounting'} });
    	expect(query.union[0].branch.query.union[0].country.value).to.equal('UK');
    	expect(query.union[0].branch.query.union[0].type.value).to.equal('accounting');
    })

    it('redundant constraints are suppressed', () => {
    	let query = Query
    		.from({x: Range.equals(2), y: Range.equals(4)})
    		.or({ x: Range.equals(2)});

    	expect(query.union.length).to.equal(1);
    	expect(query.union[0]).to.deep.equal({ x: Range.equals(2) }); 

    	query = Query
    		.from({x: Range.equals(2), y: Range.equals(4)})
    		.and({ x: Range.equals(2)});

    	expect(query.union.length).to.equal(1);
    	expect(query.union[0]).to.deep.equal({x: Range.equals(2), y: Range.equals(4)}); 
    }); 

    it('creates expression', () => {
    	let query = Query
    		.from({x: [,2], y: 4})
    		.and({ z: 5})
    		.or({x:[6,8], y:3, z:99})

    	let expression = query.toExpression();

    	expect(expression).to.equal('(x<2 and y=4 and z=5 or x>=6 and x<8 and y=3 and z=99)');
    });    

    it('creates expression with or', () => {
    	let query = Query
    		.from({x: [,2], y: 4})
    		.and(Query.from({ z: 5}).or({z : 8}));

    	let expression = query.toExpression();

    	expect(expression).to.equal('x<2 and y=4 and (z=5 or z=8)');
    });

    it('creates expression with subquery', () => {
    	let query = Query
    		.from({x: [,2], y: { alpha: [2,6], beta: { nuts: 'brazil' }}});

    	let expression = query.toExpression();

    	expect(expression).to.equal('x<2 and (y.alpha>=2 and y.alpha<6 and (y.beta.nuts=brazil))');
    });

    it('has working equals operation', () => {
    	let query1 = Query
    		.from({x: [,2], y: { alpha: [2,6], beta: { nuts: 'brazil' }}});
    	let query2 = Query
    		.from({y: { beta: { nuts: 'brazil' }, alpha: [2,6]}, x: [,2]});
    	let query3 = Query
    		.from({x: [,2], y: { alpha: [2,8], beta: { nuts: 'walnut' }}});
    	let query4 = Query
    		.from({x: [1,9], y: { alpha: [2,8], beta: { nuts: 'walnut' }}});
    	expect(query1.equals(query2)).to.be.true;
    	expect(query1.equals(query3)).to.be.false;
    	expect(query1.equals(query4)).to.be.false;
    	expect(query1.and(query3).equals(query3.and(query1))).to.be.true;
    	expect(query1.or(query3).equals(query3.or(query1))).to.be.true;
    });

    it('factorizes', () => {
    	let query = Query
    		.from({x: 2, y : [3,4], z : 8})
    		.or({x:2, y: [,4], z: 7})
    		.or({x:3, y: [3,], z: 7});

    	let factored_part = Query
    		.from({y : [3,4], z : 8})
    		.or({y: [,4], z: 7})

    	let { factored, remainder } = query.factor({ x: 2});

    	expect(remainder).to.deep.equal(Query.from({x:3, y: [3,], z: 7}));
    	expect(factored).to.deep.equal(factored_part);
    });

    it('has sane JSON representation', ()=>{
    	let query = Query
    		.from({x: 2, y : [3,4], z : 8})
    		.or({x:2, y: [,4], z: 7})
    		.or({x:3, y: [3,], z: 7});
    	let json = JSON.stringify(query);
    	expect(json).to.equal('{"union":[{"x":2,"y":[3,4],"z":8},{"x":2,"y":[null,4],"z":7},{"x":3,"y":[3,null],"z":7}]}');
    });


});