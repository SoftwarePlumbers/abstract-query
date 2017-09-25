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
* @typedef {number|string|boolean|Date} Comparable
*/


/** Return true if object is one of the comparable types
* @param object - object to test
* @returns true if object is comparable (@see Comparable)
*/
function isComparable(object) {
	let type = typeof object;
	if (type === 'number' || type === 'string' || type == 'boolean') return true;
	if (type === 'object' && object instanceof Date) return true;
	return false;
}

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

	/** Create a range containing a single value 
	* @param value - value to search for
	* @returns {Range} a Range object
	*/
	static equals(value) 				
	{ return new Equals(value); }

	/** Create a range containing values less than a given value 
	* @param value range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/
	static lessThan(value, order=DEFAULT_ORDER) 		
	{ return new LessThan(value, order); }

	/** Create a range containing values less than or equal to a given value 
	* @param value range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/
	static lessThanOrEqual(value, order=DEFAULT_ORDER) 		
	{ return new LessThanOrEqual(value, order); }

	/** Create a range containing values greater than a given value 
	* @param value range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/		
	static greaterThan(value, order=DEFAULT_ORDER) 	
	{ return new GreaterThan(value, order); }

	/** Create a range containing values greater than or equal to a given value 
	* @param value range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/		
	static greaterThanOrEqual(value, order=DEFAULT_ORDER) 	
	{ return new GreaterThanOrEqual(value, order); }

	/** Create a range containing values between the given values
	* @param lower - lower range boundary (inclusive)
	* @param upper - upper range boundary (exclusive)
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/
	static between(lower, upper, order = DEFAULT_ORDER)	{ 
		if (lower === upper) return Range.equals(lower);
		if (!order(lower,upper)) return undefined;
		return new Between(Range.greaterThanOrEqual(lower, order), Range.lessThan(upper, order));
	}

	/** Create a range with a subquery
	*
	* Objects we are querying may be complex. Where an object property contains an object or an array, we may
	* what to execute a subquery on data contained by that object or array in order to determine if the origninal
	* high-level object is matched or not. A trivial case would be a constraint that reads something like:
	* ```
	* 	{name : { last: 'Essex'}}
	* ```
	* to select objects with name.last equal to 'Essex'. This constraint can be constructed with: 
	* ```
	* 	{ name: Range.subquery(Query.fromConstraint({ last: Range.equals('Essex') } ) ) }
	* ```
	* However Range.from({last: 'Essex'}) should in most cases do the right thing more succinctly.
	*
	* @param query {Query} Subquery (which must select data for this range criterion to be satisfied)
	* @returns {Range} a Range object
	*/
	static subquery(query) {
		return new Subquery(query);
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
	* Specified bounds may be an array, a {@link Comparable} object, a {@link Bounds} object, a {@link Query) object, 
	* or a plain object that will be interpreted as a constraint. 
	*
	* | Type 		| Result
	* |-------------|-----------
	* | Array 		| [a,b] -> Range.between(a,b); [a,] -> Range.greaterThanOrEqual(a); [,a] -> Range.lessThan(a)
	* | Comparable  | Range.equals(bounds)
	* | Bounds 		| Range.fromBounds(bounds)
	* | Query 		| Range.subquery(bounds)
	* | Object 		| Range.subquery(Query.fromConstraint(bounds))
	* | Range 		| bounds
	*
	* @param {Comparable|Bounds|Query|Array|Range|Object} bounds bounding values for range
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns a range, or undefined if paramters are not compatible.
	*/
	static from(bounds, order = DEFAULT_ORDER) 	{ 

		if (Array.isArray(bounds)) {
			let lower, upper;

			if (bounds.length > 2 || bounds.length == 0) {
				throw new RangeError('Range.from must provide one or two ');
			}

			if (bounds.length > 0) {
				lower = bounds[0];
				if (lower !== undefined && lower !== null && !Range.isRange(lower)) 
					lower = Range.fromBounds(lower) || Range.greaterThanOrEqual(lower,order);
			}

			if (bounds.length > 1) {					
				upper = bounds[1];
				if (upper !== undefined && upper !== null && !Range.isRange(upper)) 
						upper = Range.fromBounds(upper) || Range.lessThan(upper,order); 
			}

			if (lower && upper) {
				if (lower.value === upper.value 
					&& lower.operator === GreaterThanOrEqual.OPERATOR
					&& upper.operator === LessThanOrEqual.OPERATOR) {
					return new Equals(lower.value);
				}

				if (order(lower.value, upper.value)) {
					return new Between(lower, upper, order);
				}
			} else {
				return upper || lower;
			}
			return undefined;
		}
		if (Range.isRange(bounds)) {
			return bounds;
		}
		if (isComparable(bounds)) {
			return Range.equals(bounds);
		}
		if (Query.isQuery(bounds)) {
			return Range.contains(bounds);
		}
		
		let fromBounds = Range.fromBounds(bounds);
		if (fromBounds) {
			return fromBounds;
		}

		return Range.subquery(Query.fromConstraint(bounds));
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

	toExpression(dimension, formatter, context)	{ 
		return formatter.operExpr(dimension, this.operator, this.value); 
	}

	equals(range)	{ 
		return this.operator === range.operator && this.value === range.value; 
	}

	toString()	{ 
		return this.toJSON().toString(); 
	}

	toBoundsObject() {
		if (this.comparator.order === DEFAULT_ORDER) {					
			return { [this.operator] : this.value }
		} else {
			return { [this.operator] : this.value, order : this.comparator.order.name }
		}	
	}

	toJSON() {
		// Check to see if we have  a valid short form.
		if (this.comparator.order === DEFAULT_ORDER) {
			if (this.operator === GreaterThanOrEqual.OPERATOR)
				return [this.value, undefined];
			if ( this.operator === LessThan.OPERATOR)
				return [undefined, this.value];
		}
		return this.toBoundsObject();
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

	toExpression(dimension, formatter, context)	{ 
		return formatter.andExpr(
				this.lower_bound.toExpression(dimension, formatter, context),
				this.upper_bound.toExpression(dimension, formatter, context)
			)
	}

	get operator() { return Between.OPERATOR; }

	equals(range) { 
		return this.operator === range.operator 
			&& this.lower_bound.equals(range.lower_bound) 
			&& this.upper_bound.equals(range.upper_bound); 
		}

	toString()	{ return this.toJSON().toString(); }

	toJSON()	{
		let lower_bound_json, upper_bound_json;

		if (this.lower_bound.comparator.order === DEFAULT_ORDER && this.lower_bound.operator === GreaterThanOrEqual.OPERATOR)
			lower_bound_json = this.lower_bound.value;
		else  
			lower_bound_json = lhis.lower_bound.toBoundsObject();

		if (this.upper_bound.comparator.order === DEFAULT_ORDER && this.upper_bound.operator === LessThan.OPERATOR)
			upper_bound_json = this.upper_bound.value;
		else  
			upper_bound_json = lhis.upper_bound.toBoundsObject();


		return [ lower_bound_json, upper_bound_json ];
	}
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

	toExpression(dimension, formatter, context)	{ 
		return formatter.operExpr(dimension, this.operator, this.value); 
	}

	equals(range)						{ return this.operator === range.operator && this.value === range.value; }

	toString()							{ return this.toJSON().toString(); }

	toBoundsObject() {
		return { [this.operator] : this.value }
	}

	toJSON() {
		return this.value;
	}
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

class Subquery extends Range {

	static get OPERATOR () { return 'contains'; }

	constructor(query) {
		super();
		this.query = query;
		this.operator = Subquery.OPERATOR;
	}

	contains(range) {
		if (range.operator === Subquery.OPERATOR) return this.query.contains(range.query);
		return false;
	}

	intersect(range) {
		if (range.operator === Subquery.OPERATOR) return this.query.and(range.query);
		return undefined;
	}

	toExpression(dimension, formatter, context) { 
		return vistor.operExpr(dimension, this.operator, subquery.toExpression(formatter, { dimension, context })); 
	}

	equals(range) { 
		return this.operator === range.operator && this.query.equals(range.query); 
	}

	toString()	{ 
		return this.toJSON().toString(); 
	}

	toBoundsObject() {
		return { [this.operator] : this.query }
	}

	toJSON() {
		return this.query;
	}	
}

module.exports = Range;

// Cyclic dependency.
var Query = require('./query');