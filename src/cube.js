const Stream = require('iterator-plumbing');
const Range = require('./range');

class Cube {

	constructor(constraints = {}) {
		Stream.fromProperties(constraints).forEach(([k,v]) => this[k] = Range.from(v));
	}

	contains(other) {
		return Stream
			.fromProperties(this)
			.every(([dimension,range]) => {
				return  other[dimension] && other[dimension].contains(range);
			});
	}

	intersect(other) {

		let result = Object.assign(new Cube(), this, other);

		for (let dimension in result) {
			let this_range = this[dimension];
			let other_range = other[dimension];
			if (this_range && other_range) {
				let range_intersection = this_range.intersect(other_range);
				if (!range_intersection) return undefined;
				result[dimension] = range_intersection;
			}
		}

		return result;
	}

	removeConstraint(dimension, range) {
		if (this[dimension].equals(range)) {
			delete this[dimension];
			return this;
		} else {
			throw new RangeError( `{ ${dimension} : ${range} } is not a factor of ${this}` );
		}
	}

	removeConstraints(constraints) {
		let result = new Cube(this);
		for (let dimension in constraints) result.removeConstraint(dimension, constraints[dimension]);
		return result;
	}


}

module.exports = Cube;
