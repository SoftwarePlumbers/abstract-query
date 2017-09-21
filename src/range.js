function DEFAULT_ORDER (a,b) { return a < b };

class Range {
	static equals(value) 				{ return new Equals(value); }
	static lessThan(value, order) 		{ return new LessThan(value, order); }
	static greaterThan(value, order) 	{ return new GreaterThan(value, order); }
	static isRange(range)				{ return range.operator !== undefined; }

	static between(lower, upper, order = DEFAULT_ORDER)	{ 
		if (!order(lower,upper)) return undefined;
		return new Between(Range.greaterThan(lower, order), Range.lessThan(upper, order));
	}

	static from(lower, upper, order = DEFAULT_ORDER) 	{ 

		if (upper === undefined) 
			return Range.isRange(lower) ? lower : Range.equals(lower);

		lower = Range.isRange(lower) ? lower : Range.greaterThan(lower, order);
		upper = Range.isRange(upper) ? upper : Range.lessThan(upper, order);

		if (order(lower.value, upper.value)) return new Between(lower, upper);

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
				this.lower_bound.toExpr(dimension, and, operator),
				this.upper_bound.toExpr(dimension, and, operator)
			)
	}

	get operator() { return Between.OPERATOR; }

	equals(range) { 
		return this.operator === range.operator 
			&& this.lower_bound.equals(range.lower_bound) 
			&& this.upper_bound.equals(range.upper_bound); 
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
		if (range.operator === GreaterThan.OPERATOR) return Range.from(range, this);
		if (range.operator === Between.OPERATOR) return Range.from(range.lower_bound, this);
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
		if (range.operator === LessThan.OPERATOR) return Range.from(this, range);
		if (range.operator === Between.OPERATOR) return Range.from(this, range.upper_bound);
		return undefined;
	}
}

module.exports = Range;