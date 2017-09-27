

/** Class representing a query parameter than can be set later.
*/
class Param {

	/** Create a new query parameter
	*
	* @param {string} name - the name of the query parameter 
	*/
	constructor(name) {
		this.name = name;
	}

	/** Create a new query parameter
	*	
	* @param {string} name - the name of the query parameter 
	*/
	static from(name) {
		return new Param(name);
	}

	/** Compare parameters
	*
	* Parameters are considered equal if their names are equal.
	* @param {Param} other parameter to compare to this one
	* @returns true if other.name equals this.name; false otherwise.
	*/
	equals(param) {
		return param.name === this.name;
	}
}

/** Proxy handler for factory. */
const FACTORY_HANDLER = {
	get(target, property) {
		return Param.from(property);
	}
}

/** Proxied factory. Factory.<name> is equivalent to Param.from("<name>")
*/
const $ = new Proxy({}, FACTORY_HANDLER);

module.exports = { $, Param };
