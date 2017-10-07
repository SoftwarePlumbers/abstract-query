
/** @typedef {Object} Param~ParamObject
* @property {string} $ - the name of the parameter
*/ 

/** Class representing a query parameter than can be set later.
*/
class Param {

	/** Create a new query parameter
	*
	* @param {string} name - the name of the query parameter 
	*/
	constructor(name) {
		this.$ = name;
	}

	/** Create a new query parameter
	*	
	* @param {string|ParamObject} name - the name of the query parameter 
	*/
	static from(name) {
		if (!name) throw new RangeError("Param.from must be supplied with a valid name");
		if (typeof name === 'string') return new Param(name);
		if (typeof name === 'object' && name.$) return new Param(name.$);
	}

	/** Check in an object is a paramter
	*
	* @param {Object} obj - object to check
	* @returns true of obj is a Param
	*/
	static isParam(obj) {
		return obj instanceof Param;
	}

	static isParamObject(obj) {
		return obj.$ !== undefined;
	}

	/** Compare parameters
	*
	* Parameters are considered equal if their names are equal.
	* @param {Param} other parameter to compare to this one
	* @returns true if other.name equals this.name; false otherwise.
	*/
	equals(param) {
		return param.$ === this.$;
	}

	/** Convert parameter to a string
	*
	* @returns the parameter name, prefixed with a '$' symbol.
	*/
	toString() {
		return '$' + this.$;
	}
}

/** Proxy handler for factory. 
* @private
*/
const FACTORY_HANDLER = {
	get(target, property) {
		return Param.from(property);
	}
}

/** Parameter factory.
*
* The factory object is assigned to the global varioable '$' so that $.__name__ is equivalent to Param.from("__name__").
* Thus parameters have a reasonably familiar appearance (given the use of $ to prefix parameters in many scripting languages)
*/
const $ = new Proxy({}, FACTORY_HANDLER);

module.exports = { $, Param };
