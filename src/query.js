const Cube = require('./cube');
const Stream = require('iterator-plumbing');

class Query {

	constructor(cubes = []) {
		this.cubes = cubes;
	}

	static fromConstraint(obj) {
		return new Query( [ new Cube(obj) ] );
	}

	optimize() {
		for (let i = 0; i < this.cubes.length; i++)
			for (let j = 0; j < this.cubes.length; j++) 
				if (this.cubes[i].contains(this.cubes[j])) {
					delete this.cubes[j];
				}
	}

	factor(dimension, range) {
		let result = [];
		let remainder = [];
		for (cube of this.cubes) {
			let factored_cube = cube.factor(dimension, range);
			if (factored_cube) 
				result.push(factored_cube);
			else 
				remainder.push(cube);
		}

		if (result.length === 0) {
			return { remainder: this };
		} else {
			let factored = new Query(result);
			if (remainder.length === 0)
				return { factored }
			else
				return { factored, remainder: new Query(remainder) }
		}
	}

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
		constraints.sort((a,b) => (a.count > b.count) ? -1 : ((b.count > a.count) ? 1 : 0))
		
		return constraints[0];
	}

	toExpression(andExpr, orExpr, operExpr) {
		if (this.cubes.length === 1) {
			return andExpr(...Stream.fromProperties(this.cubes[0]).map(([dimension,range])=>range.toExpression(name, andExpr, operExpr)).toArray());
		}
		if (this.cubes.length > 1) {
			let { dimension, range, count } = this.findFactor();

			if (count > 1) {
				let { factored, remainder } = this.factor(dimension, range);
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