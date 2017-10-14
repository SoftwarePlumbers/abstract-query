const { Param } = require('./param');
const { Stream } = require('iterator-plumbing');

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


	/** @returns true if a or b is a parameter */
	static params(a,b) 		{ return Param.isParam(a) || Param.isParam(b); }
	/** @returns true if a and b are both the same parameter */
	static paramsEqual(a,b) { return Param.isParam(a) && Param.isParam(b) && a.equals(b); }

	/** @returns {boolean} true if a = b or a and b are both the same parameter, null if either is a parameter and they are not equal, false otherwise */ 
	equals(a,b)				{ return Comparator.paramsEqual(a,b) || (Comparator.params(a,b) ? null : !this.order(a,b) && !this.order(b,a)); }
	/** @returns {boolean} true if a < b or null if a or b is a parameter */
	lessThan(a,b) 			{ return Comparator.params(a,b) ? (Comparator.paramsEqual(a,b) ? false : null) : this.order(a,b); }
	/** @returns {boolean} true if a > b or null if a or b is a parameter */
	greaterThan(a,b) 		{ return Comparator.params(a,b) ? (Comparator.paramsEqual(a,b) ? false : null) : this.order(b,a); }
	/** @returns {boolean} true if a <= b or a and b are both the same parameter, null if either is a parameter and they are not equal, false otherwise */
	greaterThanOrEqual(a,b) { return Comparator.paramsEqual(a,b) || (Comparator.params(a,b) ? null : !this.order(a,b)); }
	/** @returns {boolean} true if a >= b or a and b are both the same parameter, null if either is a parameter and they are not equal, false otherwise */
	lessThanOrEqual(a,b) 	{ return Comparator.paramsEqual(a,b) || (Comparator.params(a,b) ? null : !this.order(b,a)); }
}


/** Range is an abstract class representing a range of values.
*
* Objects extending range should implement 'contains', 'intersect', 'equals', and 'bind' operations.
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
	* | "$and"			| Range.and 				|
	* | "$has"			| Range.has 				|
	*/
	static get OPERATORS() {
		return RANGE_OPERATORS;
	}

	/** @typedef {Object|Param|Param~ParamObject} Range~SimpleValue
	*
	* A value that can be used as a parameter when creating a simple range (e.g. with Range.equals, Range.lessThan, etc)
	*/

	/** Create a range containing a single value 
	*
	* @param {Range~SimpleValue} value - value to search for
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/
	static equals(value, order=DEFAULT_ORDER) 				
	{ return new Equals( Param.isParamObject(value) ? Param.from(value) : value, order); }

	/** Create a range containing values less than a given value 
	*
	* @param {Range~SimpleValue} value - range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/
	static lessThan(value, order=DEFAULT_ORDER) 		
	{ return new LessThan(Param.isParamObject(value) ? Param.from(value) : value, order); }

	/** Create a range containing values less than or equal to a given value 
	* @param {Range~SimpleValue} value - range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/
	static lessThanOrEqual(value, order=DEFAULT_ORDER) 		
	{ return new LessThanOrEqual(Param.isParamObject(value) ? Param.from(value) : value, order); }

	/** Create a range containing values greater than a given value 
	* @param {Range~SimpleValue} value - range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/		
	static greaterThan(value, order=DEFAULT_ORDER) 	
	{ return new GreaterThan(Param.isParamObject(value) ? Param.from(value) : value, order); }

	/** Create a range containing values greater than or equal to a given value 
	* @param {Range~SimpleValue} value - range boundary
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/		
	static greaterThanOrEqual(value, order=DEFAULT_ORDER) 	
	{ return new GreaterThanOrEqual(Param.isParamObject(value) ? Param.from(value) : value, order); }

	/** @typdef {Range~SimpleValue|Range|Range~Bounds} Range~BetweenValue
	* Either a simple value or something that can be converted into a simple range.
	*/

	/** Create a range containing values between the given values
	*
	* @param {Range~BetweenValue} lower - lower range boundary (inclusive by default)
	* @param {Range~BetweenValue} upper - upper range boundary (exclusive by default)
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/
	static between(lower, upper, order = DEFAULT_ORDER)	{ 

		lower = Range.fromValue(lower, Range.greaterThanOrEqual, order);
		upper = Range.fromValue(upper, Range.lessThan, order);

		if (lower && upper) {
			return lower.intersect(upper);
		} else {
			return upper || lower;
		}
	}

	/** Provide access to global Unbounded range
	*/
	static get UNBOUNDED() {
		return new Unbounded();
	}

	/** @typedef {Range~BetweenValue|Query} Range~AnyValue
	* Anything that can be converted into a range.
	*/


	/** Create a range containing values in all the given ranges
	*
	* TODO: consider if this needs to support Between parameters.
	*
	* @param {Range~AnyValue[]} ranges
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a Range object
	*/
	static and(ranges, order=DEFAULT_ORDER) {

		let intersection = Range.UNBOUNDED;

		for (let i=0; i < ranges.length && intersection != null; i++) {
			intersection = intersection.intersect(Range.fromValue(ranges[i], order));
		}

		return intersection;
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
	* 	{ name: Range.subquery(Query.from({ last: Range.equals('Essex') } ) ) }
	* ```
	* However Range.from({last: 'Essex'}) should in most cases do the right thing more succinctly.
	*
	* @param query {Query} Subquery (which must select data for this range criterion to be satisfied)
	* @returns {Range} a Range object
	*/
	static subquery(query) {
		return new Subquery(query);
	}

	/** Create a range which includes items containing an array which has elements within a range
	*
	* Objects we are querying may be complex. Where an object property contains an array of simple objects, we may
	* what to execute a search data contained by that object or array in order to determine if the origninal
	* high-level object is matched or not. A trivial case would be a constraint that reads something like:
	* ```
	* 	{tags : { $has: 'javascript'}}
	* ```
	* to select objects with the word 'javascript' in the tags array. This constraint can be constructed with: 
	* ```
	* 	{ tags: Range.has( Range.equals('javascript') ) }
	* ```
	* @param bounds {Range} range that selects items in the array
	* @returns {Range} a Range object
	*/
	static has(bounds) {
		return new HasElementMatching(Range.fromValue(bounds));
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
	* @typedef {Object<string,Range~SimpleValue>} Range~Bounds
	*/

	/** Create a range from a bounds object
	*
	* @param {Range~Bounds} obj
	* @return {Range} a range if obj is a bounds object, null otherwise
	*/
	static fromBounds(obj) {
		let propname = Object.keys(obj)[0];
		let constructor = Range.OPERATORS[propname];
		
		if (constructor) { 
			let value = obj[propname];
			value = Param.isParamObject(value) ? Param.from(value) : value;
			return constructor(value, DEFAULT_ORDER);
		} 

		return null;
	}

	/** Create a range from a single value
	*
	* The parameter 'obj' may be a bounds object, a simple value, a parameter a Query, or a Range. The result
	* varies according to the type of obj, and whether an explicit order function is provided.
	*
	* | Type of obj 	 | order 	| Result
	* |------------------|----------|--------
	* | null			 | 			| null
	* | undefined		 | 			| undefined
	* | Range 			 | 			| obj
	* | Query 			 | 			| Range.subquery(obj)
	* | Range~Bounds 	 | 			| Range.fromBounds(obj)
	* | Param 			 | 			| default_constructor(obj, order)
	* | Param~ParamObject| 			| default_constructor(Param.from(obj), order)
	* | Object 			 | provided | default_constructor(obj, order)
	* | Object 			 | default 	| Range.subquery(Query.from(obj)) 
	*
	* @param {Range~AnyValue} obj - value
	* @param {Function} [default_constructor=Range.equals] - constructor to use if Param or Comparable is provided
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a range
	*/
	static fromValue(obj, default_constructor = Range.equals, order = DEFAULT_ORDER) {
		// as it says
		return fuckingcommonjscylicdependencybullshit(obj, default_constructor, order);
	}

	/** Create a range.
	* 
	* Specified bounds may be an array, or any object supported by Range.fromValue
	*
	* | Type 				 | Result
	* |----------------------|-----------
	* | Range~BetweenValue[] | [a,b] -> Range.between(Range.fromBounds(a,Range.greaterThanOrEqual, order), Range.fromBounds(b,Range.lessThan, order))
	* | Range~AnyValue 	 	 | Range.fromValue(object)
	*
	* @param {Range~AnyValue|Range~BetweenValue[]} bounds bounding values for range
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a range, or undefined if paramters are not compatible.
	*/
	static from(bounds, order = DEFAULT_ORDER) 	{ 

		if (Array.isArray(bounds)) {
			let lower, upper;

			if (bounds.length > 2 || bounds.length == 0) {
				throw new RangeError('Range.from must provide one or two ');
			}

			if (bounds.length > 0) {
				lower = Range.fromValue(bounds[0], Range.greaterThanOrEqual, order);
			}

			if (bounds.length > 1) {					
				upper = Range.fromValue(bounds[1], Range.lessThan, order);
			}

			return Range.between(lower,upper);
		}

		return Range.fromValue(bounds, Range.equals, order)
	}
}

/** Map range operators to constructors
* @private
*/
var RANGE_OPERATORS = {
	">"  	: Range.greaterThan,
	"<"  	: Range.lessThan,
	">=" 	: Range.greaterThanOrEqual,
	"<=" 	: Range.lessThanOrEqual,
	"="	 	: Range.equals,
	"$and" 	: Range.and,
	"$has" 	: Range.has
}

/** Range representing an unbounded data set [i.e. no constraint on data returned]
*
* @private
*/
class Unbounded extends Range {

	static get OPERATOR () { return '*'; }

	constructor() {
		super();
	}

	get operator() { return Unbounded.OPERATOR; }

	contains(range) {
		return true;
	}

	containsItem(item) {
		return true;
	}

	/** unbounded interection with range always returns range. */
	intersect(range) {
		return range;
	}

	toExpression(dimension, formatter, context)	{ 
		return formatter.operExpr(dimension, '=', '*', context); 
	}

	equals(range)						{ return this.operator === range.operator; }

	toString()							{ return this.toJSON().toString(); }

	toBoundsObject() {
		return { [this.operator] : this.operator }
	}

	toJSON() {
		return this.value;
	}

	bind(parameters) {
		return this;
	}
}

/** Base class for ranges with a single bound (e.g. less than, greater than etc.)
*
* @private
*/
class OpenRange extends Range {

	constructor(operator, value, order = DEFAULT_ORDER) {
		super();
		this.value = value;
		this.comparator = new Comparator(order);
		this.operator = operator;
	}

	toExpression(dimension, formatter, context)	{ 
		return formatter.operExpr(dimension, this.operator, this.value, context); 
	}

	equals(range)	{ 
		return this.operator === range.operator && this.comparator.equals(this.value,range.value); 
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
				return [this.value, null];
			if ( this.operator === LessThan.OPERATOR)
				return [null, this.value];
		}
		return this.toBoundsObject();
	}

}

/** Range between two bounds.
*
* @private
*/
class Between extends Range {

	static get OPERATOR () { return 'between'; }

	constructor(lower_bound, upper_bound) {
		super();
		this.lower_bound = lower_bound;
		this.upper_bound = upper_bound;
	}

	get comparator() { return this.lower_bound.comparator || this.upper_bound.comparator; }

	contains(range) {
		return this.lower_bound.contains(range) && this.upper_bound.contains(range);
	}

	containsItem(item) {
		return this.lower_bound.containsItem(range) && this.upper_bound.containsItem(range);
	}

	intersect(range) {
		if (range.operator === Unbounded.OPERATOR) return this;
		if (range.operator === Between.OPERATOR) {
			let lower_bound = this.lower_bound.intersect(range.lower_bound);
			let upper_bound = this.upper_bound.intersect(range.upper_bound);
			// intersection beween two valid lower bounds or two valid upper bounds should always exist
			return lower_bound.intersect(upper_bound);
		}
		if (range.operator === Intersection.OPERATOR) { 
			let result = range.intersect(this.lower_bound);
			if (result) result = result.intersect(this.upper_bound);
			return result;
		}
		if (range.operator === LessThan.OPERATOR || range.operator === LessThanOrEqual.OPERATOR)
			return this.upper_bound.intersect(range).intersect(this.lower_bound);
		if (range.operator === GreaterThan.OPERATOR || range.operator === GreaterThanOrEqual.OPERATOR)
			return this.lower_bound.intersect(range).intersect(this.upper_bound);
		if (range.operator === HasElementMatching.OPERATOR)
			throw new TypeError("Can't mix array operations and scalar operations on a single field");

		return null;
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

	bind(parameters) {
		let lower_bound = this.lower_bound.bind(parameters);
		let upper_bound = this.upper_bound.bind(parameters);
		if (this.lower_bound === lower_bound && this.upper_bound === upper_bound) return this;
		// Possible that after binding lower bound may be greater than upper bound, in which case we return null
		return Range.between(lower_bound, upper_bound);
	}
}

/** Range exactly equal to some value
* @private
*/
class Equals extends Range {

	static get OPERATOR () { return '='; }

	constructor(value, order) {
		super();
		this.value = value;
		this.operator = Equals.OPERATOR;
		this.comparator = new Comparator(order);
	}

	contains(range) {
		return this.equals(range);
	}


	containsItem(item) {
		return Param.isParam(this.value) ? null : this.comparator.equals(this.value, item);
	}

	intersect(range) {
		if (range.operator !== Equals.OPERATOR) 
			return (range.intersect(this));

		let is_equal = this.comparator.equals(this.value,range.value);
		if (is_equal === null) return new Intersection(this, range);
		if (is_equal) return this;
		return null;
	}

	toExpression(dimension, formatter, context)	{ 
		return formatter.operExpr(dimension, this.operator, this.value, context); 
	}

	equals(range)						{ return this.operator === range.operator && this.comparator.equals(this.value, range.value) }

	toString()							{ return this.toJSON().toString(); }

	toBoundsObject() {
		return { [this.operator] : this.value }
	}

	toJSON() {
		return this.value;
	}

	bind(parameters) {
		if (Param.isParam(this.value)) {
			let param = parameters[this.value.$];
			if (param !== undefined) return new Equals(param, this.comparator.order);
		}
		return this;
	}
}

/** Range less than some bound.
*
* @private
*/
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
		if (range.operator === Intersection.OPERATOR) {
			return range.containedBy(this);
		}

		return false; 
	}

	containsItem(item) {
		return Param.isParam(this.value) ? null : this.comparator.lessThan(item, this.value);
	}

	intersect(range) {
		if (range.operator === Unbounded.OPERATOR) return this;

		// Complex ranges are directly handled by their own class.
		if (range.operator === Between.OPERATOR || range.operator === Intersection.OPERATOR)
			return range.intersect(this);

		// a < x && a < y  -> a < x if x <= y, a < y otherwise
		// a < x && a <= y -> a < x if x <= y, a <= y otherwise 
		if (range.operator === LessThan.OPERATOR || range.operator === LessThanOrEqual.OPERATOR) {
			if (Param.isParam(this.value) || Param.isParam(range.value)) {
				// tricky - a < z && a <= z -> a < z
				if (Param.isParam(this.value) && this.comparator.equals(this.value, range.value)) return this;
				return new Intersection(this,range);
			} else {
				if (this.comparator.lessThanOrEqual(this.value, range.value)) return this;
				return range;
			}
		}

		// a < x && a > y -> y<a<x if y < x, null otherwise	
		// a < x && a >= y -> y<=a<x if y < x, null otherwise	
		if (range.operator === GreaterThan.OPERATOR || range.operator === GreaterThanOrEqual.OPERATOR) {

			if (Param.isParam(this.value) || Param.isParam(range.value)) {

				if (Param.isParam(this.value) && this.value.equals(range.value)) return null;
				return new Between(range,this);
			} else {
				
				if (this.comparator.lessThan(range.value, this.value)) {
					return new Between(range, this);
				} else {
					return null;
				}
			} 
		}

		// a < x && a = y -> a = y if y < x; null otherwise
		if (range.operator === Equals.OPERATOR) {
				if (Param.isParam(this.value) || Param.isParam(range.value)) {
					if (Param.isParam(this.value) && this.value.equals(range.value)) return null;
				return new Intersection(this,range);
			} else {
				if (this.comparator.lessThan(range.value, this.value)) {
					return range;
				} else {
					return null;
				}
			} 
		}

		if (range.operator === HasElementMatching.OPERATOR)
			throw new TypeError("Can't mix array operations and scalar operations on a single field");


		throw new RangeError("Uknown operator: ", range.operator);
	}

	bind(parameters) {
		if (Param.isParam(this.value)) {
			let param = parameters[this.value.$];
			if (param !== undefined) return new LessThan(param);
		}
		return this;
	}
}


/** Range less than or equal to some bound
*
* @private
*/
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
		if (range.operator === Intersection.OPERATOR) {
			return range.containedBy(this);
		}
		return false;
	}

	containsItem(item) {
		return Param.isParam(this.value) ? null : this.comparator.lessThanOrEqual(item, this.value);
	}

	intersect(range) {
		if (range.operator === Unbounded.OPERATOR) return this;

		// Complex ranges always handled by their own class
		if (range.operator === Between.OPERATOR || range.operator === Intersection.OPERATOR)
			return range.intersect(this);

		// a <= x && a < y  -> a <= x if x < y, a < y otherwise
		// a <= x && a <= y -> a <= x if x < y, a <= y otherwise 
		if (range.operator === LessThan.OPERATOR || range.operator === LessThanOrEqual.OPERATOR) {
			if (Param.isParam(this.value) || Param.isParam(range.value)) {
				if (Param.isParam(this.value) && this.value.equals(range.value)) return range;
				return new Intersection(this,range);
			} else {
				if (this.comparator.lessThanOrEqual(this.value,range.value)) return this;
				return range;
			}
		}

		// a <= x && a > y -> y<a<=x if y < x, null otherwise	
		if (range.operator === GreaterThan.OPERATOR) {

			if (Param.isParam(this.value) || Param.isParam(range.value)) {
				if (Param.isParam(this.value) && this.value.equals(range.value)) return null;
				return new Between(range,this);
			} else {
				
				if (this.comparator.lessThan(range.value, this.value)) {
					return new Between(range, this);
				} else {
					return null;
				}
			} 
		}

		// a <= x && a >= y -> y<=a<=x if y < x, a = x if y = x, null otherwise	
		if (range.operator === GreaterThanOrEqual.OPERATOR) {

			if (Param.isParam(this.value) || Param.isParam(range.value)) {

				if (Param.isParam(this.value) && this.value.equals(range.value)) return new Equals(this.value);
				return new Intersection(this,range);
			} else {
				
				if (this.comparator.lessThan(range.value, this.value)) {
					return new Between(range, this);
				} 
				if (this.comparator.equals(range.value, this.value)) {
					return new Equals(range.value);
				} 
				return null;
			} 
		}

		// a <= x && a = y -> a = y if y <= x; null otherwise
		if (range.operator === Equals.OPERATOR) {
				if (Param.isParam(this.value) || Param.isParam(range.value)) {
					if (Param.isParam(this.value) && this.value.equals(range.value)) return range;
				return new Intersection(this,range);
			} else {
				if (this.comparator.lessThanOrEqual(range.value, this.value)) {
					return range;
				} else {
					return null;
				}
			} 
		}

		if (range.operator === HasElementMatching.OPERATOR)
			throw new TypeError("Can't mix array operations and scalar operations on a single field");

		throw new RangeError("Uknown operator: ", range.operator);
	}

	bind(parameters) {
		if (Param.isParam(this.value)) {
			let param = parameters[this.value.$];
			if (param !== undefined) return new LessThanOrEqual(param);
		}
		return this;
	}
}

/** Range greater than some bound
*
* @private
*/
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
		if (range.operator === Intersection.OPERATOR) {
			return range.containedBy(this);
		}
		return false;
	}

	containsItem(item) {
		return Param.isParam(this.value) ? null : this.comparator.greaterThan(item, this.value);
	}

	intersect(range) {
		if (range.operator === Unbounded.OPERATOR) return this;

		// Complex ranges are directly handled by their own class.
		if (range.operator === Between.OPERATOR || range.operator === Intersection.OPERATOR)
			return range.intersect(this);

		// a > x && a > y  -> a > x if x >= y, a > y otherwise
		// a > x && a >= y -> a < x if x >= y, a >= y otherwise 
		if (range.operator === GreaterThan.OPERATOR || range.operator === GreaterThanOrEqual.OPERATOR) {
			if (Param.isParam(this.value) || Param.isParam(range.value)) {
				if (Param.isParam(this.value) && this.value.equals(range.value)) return this;
				return new Intersection(this,range);
			} else {
				if (this.comparator.greaterThanOrEqual(this.value, range.value)) return this;
				return range;
			}
		}


		// a > x && a < y -> x<a<y if x < y, null otherwise	
		// a > x && a <= y -> x<a<=y if x < y, null otherwise	
		if (range.operator === LessThan.OPERATOR || range.operator === LessThanOrEqual.OPERATOR) {

			if (Param.isParam(this.value) || Param.isParam(range.value)) {
				if (Param.isParam(this.value) && this.value.equals(range.value)) return null;
				return new Between(this,range);
			} else {
				
				if (this.comparator.lessThan(this.value, range.value)) {
					return new Between(this, range);
				} else {
					return null;
				}
			} 
		}

		// a > x && a = y -> a = y if y > x; null otherwise
		if (range.operator === Equals.OPERATOR) {
				if (Param.isParam(this.value) || Param.isParam(range.value)) {
					if (Param.isParam(this.value) && this.value.equals(range.value)) return null;
				return new Intersection(this,range);
			} else {
				if (this.comparator.greaterThan(range.value, this.value)) {
					return range;
				} else {
					return null;
				}
			} 
		}

		if (range.operator === HasElementMatching.OPERATOR)
			throw new TypeError("Can't mix array operations and scalar operations on a single field");

		throw new RangeError("Uknown operator: ", range.operator);
	}

	bind(parameters) {
		if (Param.isParam(this.value)) {
			let param = parameters[this.value.$];
			if (param !== undefined) return new GreaterThan(param);
		}
		return this;
	}
}

/** Range greater than or equal to some bound
*
* @private
*/
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
		if (range.operator === Intersection.OPERATOR) {
			return range.containedBy(this);
		}
		return false;
	}

	containsItem(item) {
		return Param.isParam(this.value) ? null : this.comparator.greaterThanOrEqual(item, this.value);
	}


	intersect(range) {

		if (range.operator === Unbounded.OPERATOR) return this;
		// Complex ranges always handled by their own class
		if (range.operator === Between.OPERATOR || range.operator === Intersection.OPERATOR)
			return range.intersect(this);

		// a >= x && a > y  -> a >= x if x > y, a > y otherwise
		// a >= x && a >= y -> a >= x if x > y, a >= y otherwise 
		if (range.operator === GreaterThan.OPERATOR || range.operator === GreaterThanOrEqual.OPERATOR) {
			if (Param.isParam(this.value) || Param.isParam(range.value)) {
				if (Param.isParam(this.value) && this.value.equals(range.value)) return range;
				return new Intersection(this,range);
			} else {
				if (this.comparator.greaterThanOrEqual(this.value,range.value)) return this;
				return range;
			}
		}

		// a >= x && a < y -> x<=a<y if y > x, null otherwise	
		if (range.operator === LessThan.OPERATOR) {

			if (Param.isParam(this.value) || Param.isParam(range.value)) {
				if (Param.isParam(this.value) && this.value.equals(range.value)) return null;
				return new Between(this,range);
			} else {
				
				if (this.comparator.greaterThan(range.value, this.value)) {
					return new Between(this,range);
				} else {
					return null;
				}
			} 
		}

		// a >= x && a <= y -> x<=a<=y if y > x, a = x if y = x, null otherwise	
		if (range.operator === LessThanOrEqual.OPERATOR) {

			if (Param.isParam(this.value) || Param.isParam(range.value)) {

				if (Param.isParam(this.value) && this.value.equals(range.value)) return new Equals(this.value);
				return new Intersection(this,range);
			} else {
				
				if (this.comparator.greaterThan(range.value, this.value)) {
					return new Between(range, this);
				} 
				if (this.comparator.equals(range.value, this.value)) {
					return new Equals(range.value);
				} 
				return null;
			} 
		}

		// a >= x && a = y -> a = y if y >= x; null otherwise
		if (range.operator === Equals.OPERATOR) {
				if (Param.isParam(this.value) || Param.isParam(range.value)) {
					if (Param.isParam(this.value) && this.value.equals(range.value)) return range;
				return new Intersection(this,range);
			} else {
				if (this.comparator.greaterThanOrEqual(range.value, this.value)) {
					return range;
				} else {
					return null;
				}
			} 
		}

		if (range.operator === HasElementMatching.OPERATOR)
			throw new TypeError("Can't mix array operations and scalar operations on a single field");

		throw new RangeError("Uknown operator: " + range.operator);
	}

	bind(parameters) {
		if (Param.isParam(this.value)) {
			let param = parameters[this.value.$];
			if (param !== undefined) return new GreaterThanOrEqual(param);
		}
		return this;
	}
}

/** Range has element within some bound
*
* @private
*/
class HasElementMatching extends Range {

	static get OPERATOR () { return 'has'; }

	constructor(bounds) {
		super();
		this.bounds = bounds;
		this.operator = HasElementMatching.OPERATOR;
	}

	contains(range) {
		if (range.operator === HasElementMatching.OPERATOR) return this.bounds.contains(range.bounds);
		return false;
	}

	containsItem(item) {
		let result = false;
		Stream.from(item).find(element => {
			let contained = this.bounds.containsItem(element);
			if (contained || contained === null) result = contained;
			return result;
		});
		return result;
	}

	intersect(range) {
		if (range.operator === Unbounded.OPERATOR) return this;
		if (range.operator === HasElementMatching.OPERATOR) return new HasElementMatching(this.bounds.intersect(range.bounds));
		throw new TypeError("Can't mix array operations and scalar operations on a single field");
	}

	toExpression(dimension, formatter, context) { 
		return formatter.operExpr(dimension, this.operator, this.bounds.toExpression(dimension, formatter, context), context); 
	}

	equals(range) { 
		return this.operator === range.operator && this.bounds.equals(range.bounds); 
	}

	toString()	{ 
		return this.toJSON().toString(); 
	}

	toBoundsObject() {
		return { [this.operator] : this.bounds.toBoundsObject() }
	}

	toJSON() {
		return this.toBoundsObject();
	}	

	bind(parameters) {
		let bounds = this.bounds.bind(parameters);
		if (bounds !== this.bounds) return new HasElementMatching(bounds);
		if (bounds === null) return null;
		return this;
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

	containsItem(item) {
		let result = false;
		Stream.from(item).find(element => {
			let contained = this.query.containsItem(element);
			if (contained || contained === null) result = contained;
			return result;
		});
		return result;
	}

	intersect(range) {
		if (range.operator === Unbounded.OPERATOR) return this;
		if (range.operator === Subquery.OPERATOR) return new Subquery(this.query.and(range.query));
		if (range.operator === HasElementMatching.OPERATOR)
			throw new TypeError("Can't mix array operations and subquery operations on a single field");
		throw new TypeError("Can't mix subquery operations and scalar operations on a single field");
	}

	toExpression(dimension, formatter, context) { 
		return formatter.operExpr(dimension, this.operator, this.query.toExpression(formatter, { dimension, context }), context); 
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

	bind(parameters) {
		let query = this.query.bind(parameters);
		if (query !== this.query) return new Subquery(query);
		if (query === null) return null;
		return this;
	}
}

/** Support a deferred intersection between parametrized ranges.
*
* @private 
*/
class Intersection extends Range {

	static get OPERATOR () { return '$and'; }


	/** construct an intersection
	*
	* Note: will throw an error if result is logically empty. We should only call this method with
	* ranges that are known to not to be exclusive, and should only call it with simple unary ranges or
	* 'between' ranges.
	* 
	* Use repeated calls of .intersect to build an intersection without these limitations.
	*/
	constructor(...ranges) {
		super();
		this.known_bounds = Range.UNBOUNDED;
		this.parametrized_bounds = {};
		this.parameters = [];
		for (let range of ranges) {
			if (!this.addRange(range)) throw new RangeError(`${range} excludes previously added ranges`);
		}
	}

	/** Add a range to this intersection.
	*
	* @returns false if then resulting range would be logically empty.
	*/
	addRange(range) {

		if (range.operator === Unbounded.OPERATOR) {
			return true;
		}

		if (range.operator === Between.OPERATOR) {
			return this.addRange(range.lower_bound) && this.addRange(range.upper_bound);
		}

		if (range.operator === Intersection.OPERATOR) {
			let result = this.addRange(range.known_bounds);
			for (let i = 0; i < range.parameters.length && result; i++)
				result = this.addRange(range.parametrized_bounds[range.parameters[i]]);
			return result;
		}

		if (Param.isParam(range.value)) {
			let old_param = this.parametrized_bounds[range.value.$];
			let new_param = old_param ? old_param.intersect(range) : range;
			if (new_param === null)  {
//				console.log('1',new_param, old_param, range);
				return false;
			}
			this.parametrized_bounds[range.value.$] = new_param;
			if (old_param === undefined) this.parameters.push(range.value.$); 
		} else {
			let known_bounds = this.known_bounds.intersect(range);
			if (known_bounds === null) {
//				console.log('2',known_bounds, this.known_bounds, range);
				return false;
			}
			this.known_bounds = known_bounds;
		}
		return true;
	}

	get comparator() {
		return this.known_bounds.comparator || this.parametrized_bounds[this.parameters[0]].comparator;
	}

	contains(range) {
		let result = this.known_bounds.contains(range);
		for (let i = 0; i < this.parameters.length && result === true; i++)
			result = this.parametrized_bounds[this.parameters[i]].contains(range);
		return result;
	}

	containsItem(item) {
		let result = this.known_bounds.contains(item);
		for (let i = 0; i < this.parameters.length && result === true; i++)
			result = this.parametrized_bounds[this.parameters[i]].containsItem(item);
		return result;
	}
		/** Determine if this range contained by another.
	*
	*
	*/
	containedBy(range) {

		// range contains intersection if it contains the known bounds, or any of the parameterized bounds
		if (range.contains(this.known_bounds)) return true;
		// the only way we can know that this range contains a parametrized range is if they have the same
		// parameter. 
		if (Param.isParam(range.value)) {
			let prange = this.parametrized_bounds[range.value.$];
			return (prange && range.contains(prange));
		}
		//However, we can return a definitive false if all the parametrized bounds return false,
		// which can happen, for example, if a 'less than' is compared to a 'greater than'
		if (Stream
			.fromProperties(this.parametrized_bounds)
			.every(([param,bounds])=>range.contains(bounds)===false))
			return false;
			
		return null;
	}

	intersect(range) {
		if (range.operator === Unbounded.OPERATOR) return this;

		if (range.operator === Intersection.OPERATOR || range.operator === Between.OPERATOR) {
			let result = range.intersect(this.known_bounds);
			for (let i = 0; i < this.parameters.length && result != null; i++)
				result = result.intersect(this.parametrized_bounds[this.parameters[i]]);
			return result;
		}

		// essentially, clone this intersection
		let result = new Intersection(this.known_bounds, ...Stream.fromProperties(this.parametrized_bounds).toValues())	;

		if (result.addRange(range)) return result;

		return null;
	}

	toExpression(dimension, formatter, context)	{ 
		return formatter.andExpr(
				this.known_bounds.toExpression(dimension, formatter, context),
				...Stream.fromProperties(this.parametrized_bounds)
					.map(([param,bounds]) => bounds.toExpression(dimension, formatter, context))
					.toArray()
			)
	}

	get operator() { return Intersection.OPERATOR; }

	equals(range) { 
		if (this.operator === range.operator && this.known_bounds.equals(range.known_bounds)) {
			if (this.parameters.length === range.parameters.length) {
				let result = true;
				for (i = 0; i < this.parameters.length && result; i++) {
					let param = parameters[i];
					let other_bound = range.parametrized_bounds[param];
					result = other_bound && this.parametrized_bounds[param].equals(other_bound);
				}
				return result;
			}
		}
		return false;
	}

	toString()	{ return JSON.stringify(this); }

	toJSON()	{
		return { $and : [ this.known_bounds.toJSON(), ...Stream.fromProperties(this.parametrized_bounds).toValues() ] };
	}

	bind(parameters) {
		let result = this.known_bounds;
		for (let i = 0; i < this.parameters.length && result; i++)
			result = result.intersect(this.parametrized_bounds[this.parameters[i]].bind(parameters));
		return result;
	}
}

module.exports = Range; 

const Query = require('./query');

/** @private */
function fuckingcommonjscylicdependencybullshit(obj, default_constructor = Range.equals, order = DEFAULT_ORDER) {
		if (!obj) return obj;
		if (Range.isRange(obj)) return obj;
		if (Query.isQuery(obj)) return Range.subquery(obj);

		let propname = Object.keys(obj)[0];
		let constructor = Range.OPERATORS[propname];
		
		// if Range.OPERATORS contained a value, we have a bounds object
		if (constructor) { 
			let value = obj[propname];
			value = Param.isParamObject(value) ? Param.from(value) : value;
			return constructor(value, order);
		} else {
			let value = Param.isParamObject(obj) ? Param.from(obj) : obj;
			if (typeof value !== 'object' || Param.isParam(value) || order !== DEFAULT_ORDER)
				return default_constructor(value, order)
			else
				return Range.subquery(Query.from(value));
		}	
}

