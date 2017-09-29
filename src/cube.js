const Stream = require('iterator-plumbing');
const Range = require('./range');

/** A cube maps each dimension in an abstract space to a range.
 *
 * @private
 */
class Cube {

	constructor(constraints = {}) {
		Stream.fromProperties(constraints).forEach(([k,v]) => this[k] = Range.from(v));
	}

	equals(other) {
		let keys = Object.keys(this);
		if (keys.length != Object.keys(other).length) return false;
		for (let key of keys) {
			if (!other[key] || !this[key].equals(other[key])) return false;
		}
		return true;
	}

	contains(other) {
		return Stream
			.fromProperties(this)
			.every(([dimension,range]) => {
				return  other[dimension] && range.contains(other[dimension]);
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
		for (let dimension in constraints) result.removeConstraint(dimension, Range.from(constraints[dimension]));
		return result;
	}

	toString() {
		return '{ ' + Stream.fromProperties(this).map(([k,v])=>`${k}:${v}`).join(', ') + ' }';
	}

	toExpression(formatter, context) {
		return formatter.andExpr(
			...Stream.fromProperties(this).map(
				([dimension,range])=>range.toExpression(dimension, formatter, context)
			).toArray()
		);
	}
}

module.exports = Cube;


