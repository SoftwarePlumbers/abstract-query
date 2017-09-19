class Range {
	isEquals() { return false; }

	static equals(value) { return new Equals(value); }
	static from(obj) { return obj instanceof Range ? obj : Range.equals(obj) }
}

class Equals extends Range {

	constructor(value) {
		super();
		this.value = value;
	}

	contains(range) {
		return (range.isEquals() && this.value === range.value);
	}

	intersect(range) {
		if (range.isEquals() && this.value === range.value) return this;
		return undefined;
	}

	equals(other) { return other.isEquals() && this.value === other.value; }

	isEquals() {
		return true;
	}

	get operator() {
		return '=';
	}
}

module.exports = Range;