const { Param } = require('./param');

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

		let comparator = new Comparator(order);

		lower = Range.fromValue(lower, Range.greaterThanOrEqual, order);
		upper = Range.fromValue(upper, Range.lessThan, order);

		if (lower && upper) {
			if (comparator.equals(lower.value, upper.value) 
				&& lower.operator === GreaterThanOrEqual.OPERATOR
				&& upper.operator === LessThanOrEqual.OPERATOR) {
					return new Equals(lower.value);
				}

			let comparison = comparator.lessThan(lower.value, upper.value);
			if (comparison ===  null || comparison) {
				return new Between(lower, upper, order);
			}
		} else {
			return upper || lower;
		}
		return undefined;
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
	* |------------------|-------------------
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
	* @param {Range~BetweenValue|Query} obj - value
	@ @param {Function} [default_constructor=Range.equals] - constructor to use if Param or Comparable is provided
	* @param {Range~OrderingFunction} [order=DEFAULT_ORDER] - compare two values and return true if the first is less than the second.
	* @returns {Range} a range
	*/
	static fromValue(obj, default_constructor = Range.equals, order = DEFAULT_ORDER) {

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

	/** Create a range.
	* 
	* Specified bounds may be an array, or any object supported by Range.fromValue
	*
	* | Type 				 | Result
	* |----------------------|-----------
	* | Range~BetweenValue[] | [a,b] -> Range.between(Range.fromBounds(a,Range.greaterThanOrEqual, order), Range.fromBounds(b,Range.lessThan, order))
	* | Range~BetweenValue 	 | Range.fromValue(object)
	* | Query 	 			 | Range.fromValue(object)
	*
	* @param {Range~BetweenValue|Range~BetweenValue[]|Query} bounds bounding values for range
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

	constructor(value, order) {
		super();
		this.value = value;
		this.operator = Equals.OPERATOR;
		this.comparator = new Comparator(order);
	}

	contains(range) {
		return this.equals(range);
	}

	intersect(range) {
		if (range.operator !== Equals.OPERATOR) 
			return (range.intersect(this));
		if (this.comparator.equals(this.value,range.value))
			return this;
		return undefined;
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
		if (range.operator === Subquery.OPERATOR) return new Subquery(this.query.and(range.query));
		return undefined;
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
}

module.exports = Range;

// Cyclic dependency.
var Query = require('./query');