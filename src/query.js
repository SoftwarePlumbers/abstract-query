const Cube = require('./cube');
const Stream = require('iterator-plumbing');
const Range = require('./range');

/**
* The result of formatting a query - can be any type, but all the methods of QueryFormatter should all return the same type. Often a String.
* @typedef {Object} QueryFormatter~Expression
*/

/** 
* Context information for subqueries
* @typedef {Object} QueryFormatter~Context
* @property {string} dimension - name of parent property
* @property {QueryFormatter~Context} context - parent context.
*/

/**
* @classdesc Interface for converting queries to expressions
*
* @name QueryFormatter
* @class
*/

/**
* Convert a number of sub-expressions into an 'or' expression
*
* @method
* @name QueryFormatter#orExpr
* @param {...QueryFormatter~Expression} subexpressions - subexpressions from which compound expression is built
* @returns {QueryFormatter~Expression} an 'or' expression.
*/

/**
* Convert a number of sub-expressions into an 'and' expression
*
* @method
* @name QueryFormatter#andExpr
* @param {...QueryFormatter~Expression} subexpressions - subexpressions from which compound expression is built
* @returns {QueryFormatter~Expression} an 'and' expression.
*/

/**
* Convert a number of sub-expressions into an 'and' expression
*
* @method
* @name QueryFormatter#operExpr
* @param {string} dimension - property or field name on which constraint operates
* @param {string} operator - the constraint operatoer
* @param {QueryFormatter~Expression|Comparable} value - the value for comparison
* @param {QueryFormatter~Context} context - for subqueries, contains chain of parent dimension names
* @returns {QueryFormatter~Expression} an operator expression.
*/

/** A Query represent an arbitrary set of constraints on a set of data.
*
* A constraint, in this case, is a mapping of a field name (or _dimension_) to a Range object. A query
* can be created from a _constraint object_ which is simply an object with a number of properties, where
* the name of each property is the field name and the value is a Range (or something that can be converted 
* into a range with Range.from).
*
* Once a query has been created, it can be combined with other queries or constraint objects using the
* `and` and `or` methods.
*
* A query can be converted into an expression using the toExpression method, which uses the provided callbacks
* to construct an expression in the desired syntax.
*
* The internal query representation is a 'canonical form' composed of a flat sequence of 'ands' joined by 'ors'. 
* Given queries a,b,c,d the internal representation of `(a.or(b)).and(c.or(d))` will actually be something like
* `a.and(c).or(a.and(d)).or(b.and(c)).or(b.and(d))`.
*
* The `optimize` method can work on this internal representation to remove redundant criteria.
*
* The `toExpression` method attempts to remove common factors from the internal representation before generating
* an expression. Calling `a.and(c).or(a.and(d)).toExpression(...)` with appropriate callbacks should generate an 
* expression like `a and (c or d)` instead of `(a and c) or (a and d)`.
*/
class Query {

	/** Construct a query from an array of cube objects.
	*
	* Should be considered a private constructor - use fromConstraint instead to create a query.
	*
	* @param {Cube[]} cubes - An array of cubes.
	*/
	constructor(cubes = []) {
		this.union = cubes;
	}

	/** A set of constraints.
	*
	* An object with properties names that represent field names on which a constraint is applied, and
	* property values represent a constraint. The constraint may be a simple comparable value, a Range
	* object, or an array with a maximum of two elements representing the lower and upper bounds of a
	* constraint.
	*
	* @typedef {Object<string,Range|Comparable[]|Comparable>} Query~ConstraintObject 
	*/

	/** Create a query from an constraint object 
	*
	* The constraint object can have any number of properties. In the following example, the resulting
	* query applies all the following constraints: w >= 3, x == 3, y >= 3, y < 7, z < 7
	* @example
1	* Query.fromConstraint({ w: [3,], x : 3, y : [3,7], z: [,7]})
	*
	* @param {Query~ConstraintObject} obj - A constraint object.
	* @returns a Query
	*/
	static fromConstraint(obj) {
		return new Query( [ new Cube(obj) ] );
	}

	static isQuery(obj) {
		return obj instanceof Query;
	}

	/** Get the default query formatter
	* @returns {QueryFormatter} the default query formatter
	*/
	static get DEFAULT_FORMAT() {

		const printDimension = (context,name) => context ? printDimension(context.context, context.dimension) + "." + name : name;

		return {
    		andExpr(...ands) { return ands.join(' and ') }, 
    		orExpr(...ors) { return "(" + ors.join(' or ') + ")"},
    		operExpr(dimension, operator, value, context) {
    			if (operator === 'contains')
    				return "(" + value + ")"
    			else	
    				return printDimension(context,dimension) + operator + value 
    		}
    	}
	}

	/** Delete any redundant critera from the query */
	optimize() {
		for (let i = 0; i < this.union.length; i++)
			for (let j = 0; j < this.union.length; j++) 
				if (this.union[i].contains(this.union[j])) {
					delete this.union[j];
				}
	}

	/**
 	* @typedef {Object} Query~FactorResult
 	* @property {Query} factored - the part of the query from which a factor has been removed
 	* @property {Query} remainder - the part of the query from which a factor could not be removed
 	*/

	/** Attempt to simplify a query by removing a common factor from the canonical form.
	*
	* Given something like: 
	* ```
    *	let query = Query
    *		.fromConstraint({x: 2, y : [3,4], z : 8})
    *		.or({x:2, y: [,4], z: 7})
    *		.or({x:3, y: [3,], z: 7});
	*
    *	let { factored, remainder } = query.factor({ x: 2});
	* ```
	* factored should equal `Query.fromConstraint({y : [3,4], z : 8}).or({y: [,4], z: 7})` and
	* remainder should equal `Query.fromConstraint({x:3, y: [3,], z: 7})`
	*
	* @param {ConstraintObject} constraint - object to factor out of query
	* @return {Query~FactorResult} 
	*/
	factor(common) {
		let result = [];
		let remainder = [];
		for (let cube of this.union) {
			try {
				let factored_cube = cube.removeConstraints(common);
				result.push(factored_cube);
			} catch (err) {
				remainder.push(cube);
			}
		}

		if (result.length === 0) {
			return { remainder: this };
		} else {
			let factored = new Query(result);
			if (remainder.length === 0)
				return { factored }
			else {
 				return { factored, remainder: new Query(remainder) }
			}
		}
	}

	/** Find the factor that is common to the largest number of sub-expressions in canonical form.
	*
	* @returns {Object} A constraint object containing the common factor, or undefined.
	*/
	findFactor() {
		let constraints = [];
		for (let cube of this.union) {
			for (let dimension in cube) {
				let match = false;
				for ( let bucket of constraints) {
					if (bucket.dimension === dimension && bucket.range.equals(cube[dimension])) {
						bucket.count++;
						match = true;
					}
				} 
				if (!match) constraints.push({ dimension, count: 1, range: cube[dimension] });
			}
		}

		let bucket = constraints
			.filter(a=>a.count > 1)
			.sort((a,b) => (a.count > b.count) ? -1 : ((b.count > a.count) ? 1 : 0))
			.shift();

		return bucket === undefined ? undefined : { [bucket.dimension] : bucket.range };
	}


	/** Convert a query to a an expression.
	*
	* @param {QueryFormatter} [formatter=Query~DEFAULT_FORMATTER] - Generates expressions from element of a query
	* @param {Context} [context] - context information
	* @returns {Expression} expression - result expression. Typically a string but can be any type.
	*/
	toExpression(formatter=Query.DEFAULT_FORMAT, context) {
		if (this.union.length === 1) {
			return formatter.andExpr(...Stream.fromProperties(this.union[0]).map(([dimension,range])=>range.toExpression(dimension,formatter,context)).toArray());
		}
		if (this.union.length > 1) {
			let factor = this.findFactor();

			if (factor) {
				let dimension = Object.keys(factor).shift();
				let range = factor[dimension];
				let { factored, remainder } = this.factor(factor);


				if (factored && remainder) 
					return formatter.orExpr(
						formatter.andExpr(
							range.toExpression(dimension, formatter, context), 
							factored.toExpression(formatter, context)
						),
						remainder.toExpression(formatter, context)
					);

				if (factored) 
					return formatter.andExpr(
						range.toExpression(dimension, formatter, context), 
						factored.toExpression(formatter, context)
					);
			} else {
				return formatter.orExpr(
					...this.union.map(
						cube => formatter.andExpr(
							...Stream.fromProperties(cube).map(
								([dimension,range])=>range.toExpression(dimension, formatter, context)
							).toArray()
						)
					)
				);
			}

		}
	}

	/** Create a new query that will return results in this query or some cube.
	* @private 
	* @param {Cube} other_cube - cube of additional results
	* @returns {Query} a new compound query.
	*/
	_orCube(other_cube) {
		let result = [];
		let match = false;
		for (let cube of this.union) {
			if (cube.contains(other_cube)) {
				match = true;
				result.push(cube);
			} else if (other_cube.contains(cube)) {
				match = true;
				result.push(other_cube);
			} else {
				result.push(cube);
			}
		}
		if (!match) result.push(other_cube);

		return new Query(result);
	}

	/** Create a new query that will return the union of results in this query with some other constraint.
	*
	* @param {Query~ConstraintObject} other_constraint
	* @returns {Query} a new compound query.
	*/
	orConstraint(other_constraint) {
		return this._orCube(new Cube(other_constraint));
	}

	/** Create a new query that will return the union of results in this query and with some other query.
	*
	* @param {Query} other_query - the other query
	* @returns {Query} a new compound query that is the union of result sets from both queries
	*/
	orQuery(other_query) {
		let result = this;
		for (cube of other_query.cubes) {
			result = result.orCube(cube);
		}
	}

	/** Create a new query that will return the union of results in this query and with some other query or constraint.
	*
	* @param {Query|Query~ConstraintObject} obj - the other query or constraint
	* @returns {Query} a new compound query that is the union of result sets
	*/
	or(obj) {
		if (obj instanceof Query) return this.orQuery(obj);
		if (obj instanceof Cube) return this._orCube(obj);
		return this.orConstraint(obj);
	}

	/** Create a new query that will return results that are in this query and in some cube.
	* @private 
	* @param {Cube} other_cube - cube of additional results
	* @returns {Query} a new compound query.
	*/
	_andCube(other_cube) {
		let result = [];
		for (let cube of this.union) {
			let intersection = cube.intersect(other_cube);
			if (intersection) result.push(intersection);
		}
		return new Query(result);
	}

	/** Create a new query that will return results in this query that also comply with some other constraint.
	*
	* @param {Query~ConstraintObject} other_constraint
	* @returns {Query} a new compound query.
	*/
	andConstraint(constraint) {
		return this._andCube(new Cube(constraint));
	}


	/** Create a new query that will return the intersection of results in this query and some other query.
	*
	* @param {Query} other_query - the other query
	* @returns {Query} a new compound query that is the intersection of result sets from both queries
	*/
	andQuery(other_query) {
		let result = other_query;
		for (let cube of this.union) {
			result = result._andCube(cube);
		}
		return result;
	}

	/** Create a new query that will return the union of results in this query and with some other query or constraint.
	*
	* @param {Query|Query~ConstraintObject} obj - the other query or constraint
	* @returns {Query} a new compound query that is the union of result sets
	*/
	and(obj) {
		if (obj instanceof Query) return this.andQuery(obj);
		if (obj instanceof Cube) return this._andCube(obj);
		return this.andConstraint(obj);
	}

	/** Establish if this results of this query would be a superset of the given query.
	*
	* @param {Query} other_query - the other query
	* @returns true if other query is a subset of this one.
	*/
	containsQuery(other_query) {
		for (let cube of other_query.union)
			if (!this._containsCube(cube)) return false
		return true;
	}

	/** Establish if this results of this query would be a superset of the given cube.
	*
	* @private
	* @param {Cube} cube - the cube
	* @returns true if cube is a subset of this one.
	*/
	_containsCube(cube) {
		for (let c of this.union) {
			if (c.contains(cube)) return true;
		}
		return false;
	}

	/** Establish if this results of this query would be a superset of the given constraint.
	*
	* @param {Query~ConstraintObject} constraint - the constraint
	* @returns true if constraint is a subset of this query.
	*/
	containsConstraint(donstraint) {
		return this._containsCube(new Cube(constraint));
	}

	/** Establish if this results of this query would be a superset of the given constraint or query.
	*
	* @param {Query~ConstraintObject|Query} obj - the constraint or query
	* @returns true if obj is a subset of this query.
	*/
	contains(obj) {
		if (obj instanceof Query) return this.containsQuery(obj);
		if (obj instanceof Cube) return this._containsCube(obj);
		return this.containsConstraint(obj);
	}

	/** Establish if this result of this query is the same as the given query.
	*
	* @param {Query} other_query - the other query
	* @returns true if other query is a subset of this one.
	*/
	equalsQuery(other_query) {
		let unmatched = Array.from(other_query.union);
		// Complicated by the fact that this.union and other_query.union may not be in same order
		for (let constraint of this.union) {
			let index = unmatched.findIndex(item => constraint.equals(item));
			if (index < 0) return false;
			delete unmatched[index];
		}
		return unmatched.reduce(a=>a+1,0) === 0; // Array.length not change by delete
	}

	/** Establish if this result of this query is the same as the given cube.
	*
	* @private
	* @param {Cube} cube - cube to compare
	* @returns true if results of this query would be the same as the notional results for the cube.
	*/
	_equalsCube(cube) {
		if (this.union.length != 1) return false;
		return this.union[0].equals(cube);
	}

	/** Establish if this results of this query would be the same as for a query created from the given constraint.
	*
	* @param {Query~ConstraintObject} constraint - the constraint
	* @returns true if constraint is the same as this query.
	*/
	equalsConstraint(other_constraint) {
		return _equalsCube(new Cube(other_constraint));
	}

	/** Establish if this results of this query would be a superset of the given constraint or query.
	*
	* @param {Query~ConstraintObject|Query} obj - the constraint or query
	* @returns true if obj is a subset of this query.
	*/
	equals(obj) {
		if (obj instanceof Query) return this.equalsQuery(obj);
		if (obj instanceof Cube) return this._equalsCube(obj);
		return this.equalsConstraint(obj);
	}
}

module.exports = Query;