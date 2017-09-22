/** Default comparator.
* @param a first parameter
* @param b second parameter
* @return a < b
*/
function DEFAULT_ORDER (a,b) { return a < b };

/** Range is an abstract class representing a range of values.
*
* Objects extending range should implement 'contains' and 'intersect' operations.
*
* Not all ranges are necessarily continuous (like dates/times) or numeric. A Range may also represent
* a node in a directed graph - in which case 'contains' may mean 'is a parent of' and 'intersect' may 
* mean 'common subtree'.
*
* Range also provides a number of static functions that construct new instances of Range (or 
* usually of some subclass of range).
*
*/
class Range {
	/** Create a range containing a single value */
	static equals(value) 				
	{ return new Equals(value); }

	/** Create a range containing values less than a given value 
	* @param value range boundary
	* @param {Function} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	*/
	static lessThan(value, order=DEFAULT_ORDER) 		
	{ return new LessThan(value, order); }

	/** Create a range containing values greater than a given value 
	* @param value range boundary
	* @param {Function} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	*/		
	static greaterThan(value, order=DEFAULT_ORDER) 	
	{ return new GreaterThan(value, order); }


	/** Create a range containing values between the given values
	* @param lower - lower range boundary
	* @param upper - upper range boundary
	* @param {Function} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	*/
	static between(lower, upper, order = DEFAULT_ORDER)	{ 
		if (!order(lower,upper)) return undefined;
		return new Between(Range.greaterThan(lower, order), Range.lessThan(upper, order));
	}

	/** Check to see if an object is a Range 
	*
	* @param obj - object to check.
	* @return true if obj has operator, contains, and intersect properties.
	*/
	static isRange(obj)				{ return obj.operator && obj.contains && obj.intersect; }

	/** Create a range.
	* 
	* Specified bounds may be an array, an object, or a range
	*
	* @param {Range|Object|Array} bounds bounding values for range
	* @param {Function} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns a range, or undefined if paramters are not compatible.
	*/
	static from(bounds, order = DEFAULT_ORDER) 	{ 

		if (Array.isArray(bounds)) {
			if (bounds.length > 0) {
				let lower = bounds[0];
				if (lower !== undefined && !Range.isRange(lower)) lower = Range.greaterThan(lower); 
				if (bounds.length > 1) {					
					let upper = bounds[1];
					if (upper !== undefined && !Range.isRange(upper)) upper = Range.lessThan(upper); 
					if (bounds.length > 2) {
						throw new RangeError('Range.from allows maximum of two bounds');
					} else {
						if (lower) {
							if (order(lower.value, upper.value)) {
								return new Between(lower, upper);
							}
						} else {
							return upper;
						}
					}
				} else {
					return lower;
				}
			}

		} else {
			return Range.isRange(bounds) ? bounds : Range.equals(bounds);
		}

		return undefined;
	}
}


class OpenRange extends Range {

	constructor(operator, value, order = DEFAULT_ORDER) {
		super();
		this.value = value;
		this.operator = operator;
		this.order = order;
	}

	lessThan(other) 					{ return this.order(this.value, other.value); }
	greaterThan(other) 					{ return this.order(other.value, this.value); }
	toExpression(dimension, and, operator)	{ return operator(dimension, this.operator, this.value); }
	equals(range)						{ return this.operator === range.operator && this.value === range.value; }
	toString()							{ return `${this.operator} ${this.value}`; }
}


class Between extends Range {

	static get OPERATOR () { return 'between'; }

	constructor(lower_bound, upper_bound) {
		super();
		this.lower_bound = lower_bound;
		this.upper_bound = upper_bound;
	}

	contains(range) {
		return this.lower_bound.contains(range) && this.upper_bound.contains(range);
	}

	intersect(range) {
		let result = this.lower_bound.intersect(range);
		if (result) result = this.upper_bound.intersect(result);
		return result;
	}

	toExpression(dimension, and, operator)	{ 
		return and(
				this.lower_bound.toExpression(dimension, and, operator),
				this.upper_bound.toExpression(dimension, and, operator)
			)
	}

	get operator() { return Between.OPERATOR; }

	equals(range) { 
		return this.operator === range.operator 
			&& this.lower_bound.equals(range.lower_bound) 
			&& this.upper_bound.equals(range.upper_bound); 
		}

	toString()							{ return `between(${this.lower_bound}, ${this.upper_bound})`; }
}

class Equals extends Range {

	static get OPERATOR () { return '='; }

	constructor(value) {
		super();
		this.value = value;
		this.operator = Equals.OPERATOR;
	}

	contains(range) {
		return (range.operator === Equals.OPERATOR && this.value === range.value);
	}

	intersect(range) {
		if (range.operator === Equals.OPERATOR && this.value === range.value) return this;
		if (range.operator === LessThan.OPERATOR && range.greaterThan(this)) return this;
		if (range.operator === GreaterThan.OPERATOR && range.lessThan(this)) return this;
		if (range.operator === Between.OPERATOR && range.contains(this)) return this;
		return undefined; 
	}

	toExpression(dimension, and, operator)	{ return operator(dimension, this.operator, this.value); }

	equals(range)						{ return this.operator === range.operator && this.value === range.value; }

	toString()							{ return `=${this.value}`; }
}

class LessThan extends OpenRange {

	static get OPERATOR () { return '<'; }

	constructor(value, order) {
		super(LessThan.OPERATOR, value, order);
	}

	contains(range) {
		if (range.operator === Equals.OPERATOR) return !this.lessThan(range);
		if (range.operator === LessThan.OPERATOR) return !this.lessThan(range);
		if (range.operator === Between.OPERATOR) return this.contains(range.upper_bound);
		return false;
	}

	intersect(range) {
		if (this.contains(range)) return range;
		if (range.contains(this)) return this;
		if (range.operator === GreaterThan.OPERATOR) return Range.from([range, this], this.order);
		if (range.operator === Between.OPERATOR) return Range.from([range.lower_bound, this], this.order);
		return undefined;
	}
}

class GreaterThan extends OpenRange {

	static get OPERATOR () { return '>'; }

	constructor(value, order) {
		super(GreaterThan.OPERATOR, value, order);
	}

	contains(range) {
		if (range.operator === Equals.OPERATOR) return !this.greaterThan(range);
		if (range.operator === GreaterThan.OPERATOR) return !this.greaterThan(range);
		if (range.operator === Between.OPERATOR) return this.contains(range.lower_bound);
		return false;
	}

	intersect(range) {
		if (this.contains(range)) return range;
		if (range.contains(this)) return this;
		if (range.operator === LessThan.OPERATOR) return Range.from([this, range], this.order);
		if (range.operator === Between.OPERATOR) return Range.from([this, range.upper_bound], this.order);
		return undefined;
	}
}

module.exports = Range;