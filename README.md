# ![Software Plumbers](http://docs.softwareplumbers.com/common/img/SquareIdent-160.png) Abstract Query

Abstract query, providing for client-side optimisation of queries.

## Example

```javascript

let query = Query
	.from({ 
		course: 'javascript 101', 
		student: { age : [21,] }, 
		grade: [,'C']
	}).or({ 
		course: 'medieval French poetry', 
		student: { age: [40,65]}, 
		grade: [,'C']
	})

let expr = query.toExpression();
```

and expression should equal:

`grade<"C" and (course="javascript 101" and (student.age>=21) or course="medieval French poetry" and (student.age>=40 and student.age<65))`

Note that the common expression `grade<"C"` has been factored out of the 'or'. Plainly that's not all that much use in this simple example but when programatically constructing complex queries it is extremely useful to ensure that the query that ultimately sent to the data store is reasonably concise.

The `toExpression` method takes a formatter object so that query objects can be used to create any kind of output. For example:

```javascript
const formatter = {
	andExpr(...ands) { return ands.join(' && ') }, 
	orExpr(...ors) { return "(" + ors.join(' || ') + ")"},
	operExpr(dimension, operator, value, context) { 
		return (operator === 'contains')
			? dimension"[" + value + "]"
			: dimension + operator +value 
	}

let expr = query.toExpression(formatter)
```

Will result in an expr like: 

`grade<"C" && (course="javascript 101" && student[age>="21"] || course="medieval French poetry" && student[age>="40" && age<"65"])`

The objective is to provide several different expression formatters, to support (at a minumum) constructing javascript expressions for filtering arrays, mongodb queries, and mysql queries. These formatters will be provided in separate packages so that a code can be written to the abstract-query API without creating a dependency on any given back-end store.

Abstract query will also aid in building any kind of caching layer. Because abstract-query actually stores the query in an internal canoncial form, two queries can be compared for equality even if they are outwardly somewhat different. Thus:

```javascript
let query1 = Query.from({x: [,2], y: { alpha: [2,6], beta: { nuts: 'brazil' }}});
let query2 = Query.from({y: { beta: { nuts: 'brazil' }, alpha: [2,6]}, x: [,2]});
let query3 = query1.and(query2);
let query4 = query2.and(query1);

query1.equals(query2) // true
query3.equals(query4) // true
```

Even better, query.contains allows you to detect whether one query is a subset of another; thus data can be potentially be retrieved by just filtering an existing cached result set rather than requerying the data store for data we already have.

For the latest API documentation see [The Software Plumbers Site](http://docs.softwareplumbers.com/abstract-query/master)

## Project Status

Beta. The API is stabilising, and although unit test coverage could be better it seems broadly functional. We are building downstream code (the above-mentioned formatters, for example).

