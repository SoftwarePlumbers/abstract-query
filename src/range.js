/** Default comparator.
* @param a first parameter
* @param b second parameter
* @return a < b
*/
function DEFAULT_ORDER (a,b) { return a < b };

/** Compare two values and return the lesser
* @callback Range~OrderingFunction
* @param a - first value to compare
* @param b - second value to compare
* @returns {boolean} true if a < b
*/

/** Types on which comparison operators are valid.
* @typedef {number|string|Date} Comparable
*/

/** Utility class - help compare values
*
*/
class Comparator {

	/** 
	* @param {Range~OrderingFunction} simple comparison function 
	*/
	constructor(order) {
		this.order = order;
	}

	/** @returns {boolean} true if a < b */
	lessThan(a,b) 			{ return this.order(a,b); }
	/** @returns {boolean} true if a > b */
	greaterThan(a,b) 		{ return this.order(b,a); }
	/** @returns {boolean} true if a <= b */
	greaterThanOrEqual(a,b) { return !this.lessThan(a,b); }
	/** @returns {boolean} true if a >= b */
	lessThanOrEqual(a,b) 	{ return !this.greaterThan(a,b); }
}

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

	/** Object mapping of range operators to constructor functions
	*
	* | Operator String | Constructor Function 		|
	* |-----------------|---------------------------|
	* | ">"				| Range.greaterThan 		|
	* | "<"				| Range.LessThan 			|
	* | ">="			| Range.greaterThanOrEqual 	|
	* | "<="			| Range.lessThanOrEqual 	|
	* | "="				| Range.equal 				|
	*/
	static get OPERATORS() {
		return RANGE_OPERATORS;
	}

	/** Create a range containing a single value */
	static equals(value) 				
	{ return new Equals(value); }

	/** Create a range containing values less than a given value 
	* @param value range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	*/
	static lessThan(value, order=DEFAULT_ORDER) 		
	{ return new LessThan(value, order); }

	/** Create a range containing values less than or equal to a given value 
	* @param value range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	*/
	static lessThanOrEqual(value, order=DEFAULT_ORDER) 		
	{ return new LessThanOrEqual(value, order); }

	/** Create a range containing values greater than a given value 
	* @param value range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	*/		
	static greaterThan(value, order=DEFAULT_ORDER) 	
	{ return new GreaterThan(value, order); }

	/** Create a range containing values greater than or equal to a given value 
	* @param value range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	*/		
	static greaterThanOrEqual(value, order=DEFAULT_ORDER) 	
	{ return new GreaterThanOrEqual(value, order); }

	/** Create a range containing values between the given values
	* @param lower - lower range boundary (inclusive)
	* @param upper - upper range boundary (exclusive)
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	*/
	static between(lower, upper, order = DEFAULT_ORDER)	{ 
		if (lower === upper) return Range.equals(lower);
		if (!order(lower,upper)) return undefined;
		return new Between(Range.greaterThanOrEqual(lower, order), Range.lessThan(upper, order));
	}

	/** Check to see if an object is a Range 
	*
	* @param obj - object to check.
	* @return true if obj has operator, contains, and intersect properties.
	*/
	static isRange(obj)	{ return obj.operator && obj.contains && obj.intersect; }

	/** Bounds object
	*
	* An object with a single property key that is one of the operators defined in Range.OPERATORS. The value
	* of the property should be comparable.
	*
	* @typedef {Object<string,Comparable>} Range~Bounds
	*/

	/** Create a range from a bounds object 
	*
	* A bounds object is an object in the form { "<operator>" : value } (e.g. { ">" : 7 }). Returns
	* null if obj is not a valid bounds object.
	* @param {Range~Bounds} bounds object
	* @returns a range
	*/
	static fromBounds(obj) {
		let propname = Object.keys(obj)[0];
		let constructor = Range.OPERATORS[propname];
		if (constructor) return constructor(obj[propname]);
		return null;
	}

	/** Create a range.
	* 
	* Specified bounds may be an array, an object, or a range
	*
	* @param {Range|Object|Array} bounds bounding values for range
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns a range, or undefined if paramters are not compatible.
	*/
	static from(bounds, order = DEFAULT_ORDER) 	{ 

		if (Array.isArray(bounds)) {
			if (bounds.length > 0) {
				let lower = bounds[0];
				if (lower !== undefined && !Range.isRange(lower)) lower = Range.fromBounds(lower) || Range.greaterThanOrEqual(lower); 
				if (bounds.length > 1) {					
					let upper = bounds[1];
					if (upper !== undefined && !Range.isRange(upper)) upper = Range.fromBounds(upper) || Range.lessThan(upper); 
					if (bounds.length > 2) {
						throw new RangeError('Range.from allows maximum of two bounds');
					} else {
						if (lower) {
							if (lower.value === upper.value 
								&& lower.operator === GreaterThanOrEqual.OPERATOR
								&& upper.operator === LessThanOrEqual.OPERATOR) {
								return new Equals(lower.value);
							}
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
			return Range.isRange(bounds) ? bounds : Range.fromBounds(bounds) || Range.equals(bounds);
		}

		return undefined;
	}
}

/** Map range operators to constructors
* @private
*/
var RANGE_OPERATORS = {
	">"  : Range.greaterThan,
	"<"  : Range.lessThan,
	">=" : Range.greaterThanOrEqual,
	"<=" : Range.lessThanOrEqual,
	"="	 : Range.equals
}


class OpenRange extends Range {

	constructor(operator, value, order = DEFAULT_ORDER) {
		super();
		this.value = value;
		this.comparator = new Comparator(order);
		this.operator = operator;
	}

	toExpression(dimension, and, operator)	{ 
		return operator(dimension, this.operator, this.value); 
	}

	equals(range)	{ 
		return this.operator === range.operator && this.value === range.value; 
	}

	toString()	{ 
		return `${this.operator} ${this.value}`; 
	}
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
		return this.equals(range);
	}

	intersect(range) {
		if (range.operator !== Equals.OPERATOR) 
			return (range.intersect(this));
		if (this.value === range.value)
			return this;
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
		if (range.operator === Equals.OPERATOR || range.operator === LessThanOrEqual.OPERATOR) 
			return this.comparator.lessThan(range.value, this.value);
		if (range.operator === LessThan.OPERATOR) 
			return this.comparator.lessThanOrEqual(range.value, this.value);
		if (range.operator === Between.OPERATOR) 
			return this.contains(range.upper_bound);

		return false;
	}

	intersect(range) {
		if (this.contains(range)) 
			return range;
		if (range.contains(this)) 
			return this;
		if (range.operator === GreaterThan.OPERATOR || range.operator === GreaterThanOrEqual.OPERATOR) 
			return Range.from([range, this], this.order);
		if (range.operator === Between.OPERATOR) 
			return Range.from([range.lower_bound, this], this.order);

		return undefined;
	}
}

class LessThanOrEqual extends OpenRange {

	static get OPERATOR () { return '<='; }

	constructor(value, order) {
		super(LessThanOrEqual.OPERATOR, value, order);
	}

	contains(range) {
		if (range.operator === Equals.OPERATOR || range.operator === LessThan.OPERATOR || range.operator === LessThanOrEqual.OPERATOR) 
			return this.comparator.lessThanOrEqual(range.value, this.value);
		if (range.operator === Between.OPERATOR) 
			return this.contains(range.upper_bound);

		return false;
	}

	intersect(range) {
		if (this.contains(range)) 
			return range;
		if (range.contains(this)) 
			return this;
		if (range.operator === GreaterThan.OPERATOR || range.operator === GreaterThanOrEqual.OPERATOR) 
			return Range.from([range, this], this.order);
		if (range.operator === Between.OPERATOR) 
			return Range.from([range.lower_bound, this], this.order);

		return undefined;
	}

}

class GreaterThan extends OpenRange {

	static get OPERATOR () { return '>'; }

	constructor(value, order) {
		super(GreaterThan.OPERATOR, value, order);
	}


	contains(range) {
		if (range.operator === Equals.OPERATOR || range.operator === GreaterThanOrEqual.OPERATOR) 
			return this.comparator.greaterThan(range.value, this.value);
		if (range.operator === GreaterThan.OPERATOR) 
			return this.comparator.greaterThanOrEqual(range.value, this.value);
		if (range.operator === Between.OPERATOR) 
			return this.contains(range.lower_bound);

		return false;
	}

	intersect(range) {
		if (this.contains(range)) 
			return range;
		if (range.contains(this)) 
			return this;
		if (range.operator === LessThan.OPERATOR || range.operator === LessThanOrEqual.OPERATOR) 
			return Range.from([this, range], this.order);
		if (range.operator === Between.OPERATOR) 
			return Range.from([this, range,upper_bound], this.order);

		return undefined;
	}
}

class GreaterThanOrEqual extends OpenRange {

	static get OPERATOR () { return '>='; }

	constructor(value, order) {
		super(GreaterThanOrEqual.OPERATOR, value, order);
	}


	contains(range) {
		if (range.operator === Equals.OPERATOR || range.operator === GreaterThan.OPERATOR || range.operator === GreaterThanOrEqual.OPERATOR) 
			return this.comparator.greaterThanOrEqual(range.value, this.value);
		if (range.operator === Between.OPERATOR) 
			return this.contains(range.lower_bound);

		return false;
	}

	intersect(range) {
		if (this.contains(range)) 
			return range;
		if (range.contains(this)) 
			return this;
		if (range.operator === LessThan.OPERATOR || range.operator === LessThanOrEqual.OPERATOR) 
			return Range.from([this, range], this.order);
		if (range.operator === Between.OPERATOR) 
			return Range.from([this, range.upper_bound], this.order);

		return undefined;
	}
}

module.exports = Range;