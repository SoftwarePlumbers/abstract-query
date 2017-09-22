const Cube = require('./cube');
const Stream = require('iterator-plumbing');

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
	* @param {Cube[]} An array of cubes.
	*/
	constructor(cubes = []) {
		this.cubes = cubes;
	}

	/** Create a query from an constraint object 
	*
	* The constraint object can have any number of properties. In the following example, the resulting
	* query applies all the following constraints: w >= 3, x == 3, y >= 3, y < 7, z < 7
	* @example
1	* Query.fromConstraint({ w: [3,], x : 3, y : [3,7], z: [,7]})
	*
	* @param {Object} A constraint object.
	* @returns a Query
	*/
	static fromConstraint(obj) {
		return new Query( [ new Cube(obj) ] );
	}

	/** Delete any redundant critera from the query */
	optimize() {
		for (let i = 0; i < this.cubes.length; i++)
			for (let j = 0; j < this.cubes.length; j++) 
				if (this.cubes[i].contains(this.cubes[j])) {
					delete this.cubes[j];
				}
	}

	/**
 	* @typedef {Object} FactorResult
 	* @property {Query} factored the part of the query from which a factor has been removed
 	* @property {Query} remainder the part of the query from which a factor could not be removed
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
	* @param {Object} constraint - object to factor out of query
	* @return {FactorResult} 
	*/
	factor(common) {
		let result = [];
		let remainder = [];
		for (let cube of this.cubes) {
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
		for (let cube of this.cubes) {
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

	toExpression(andExpr, orExpr, operExpr) {
		if (this.cubes.length === 1) {
			return andExpr(...Stream.fromProperties(this.cubes[0]).map(([dimension,range])=>range.toExpression(name, andExpr, operExpr)).toArray());
		}
		if (this.cubes.length > 1) {
			let factor = this.findFactor();
			if (factor) {
				let dimension = Object.keys(factor).shift();
				let range = factor[dimension];
				let { factored, remainder } = this.factor(factor);
				if (factored && remainder) return orExpr(andExpr(range.toExpression(dimension, andExpr, operExpr), toExpression(factored)),toExpression(remainder));
				if (factored) return andExpr(range.toExpression(dimension, andExpr, operExpr), toExpression(factored));
			} else {
				return orExpr(...this.cubes.map(cube => andExpr(...Stream.fromProperties(cube).map(([dimension,range])=>range.toExpression(dimension, andExpr, operExpr)).toArray())));
			}

		}
	}

	orCube(other_cube) {
		let result = [];
		let match = false;
		for (let cube of this.cubes) {
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

	orConstraint(other_constraint) {
		return this.orCube(new Cube(other_constraint));
	}

	orQuery(other_query) {
		let result = this;
		for (cube of other_query.cubes) {
			result = result.orCube(cube);
		}
	}

	or(obj) {
		if (obj instanceof Query) return this.orQuery(obj);
		if (obj instanceof Cube) return this.orCube(obj);
		return this.orConstraint(obj);
	}

	andCube(other_cube) {
		let result = [];
		for (let cube of this.cubes) {
			let intersection = cube.intersect(other_cube);
			if (intersection) result.push(intersection);
		}
		return new Query(result);
	}

	andConstraint(constraint) {
		return this.andCube(new Cube(constraint));
	}

	andQuery(other_query) {
		let result = other_query;
		for (cube of this.cubes) {
			let result = result.andCube(cube);
		}
		return result;
	}

	and(obj) {
		if (obj instanceof Query) return this.andQuery(obj);
		if (obj instanceof Cube) return this.andCube(obj);
		return this.andConstraint(obj);
	}
}

module.exports = Query;